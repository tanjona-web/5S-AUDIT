"""
5S Audit — Confection Textile
Backend Flask (API REST + rendu du front-end existant).

Lancer avec :  python app.py
Puis ouvrir :  http://127.0.0.1:5000
"""
import json

from flask import Flask, jsonify, render_template, request

from db import LINES, get_connection, init_db

app = Flask(__name__)


# ----------------------------------------------------------------------
# Page d'accueil (sert le front-end)
# ----------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html", lines=LINES)


# ----------------------------------------------------------------------
# Auth auditeur
# ----------------------------------------------------------------------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    auditor_id = (data.get("id") or "").strip().upper()
    pin = (data.get("pin") or "").strip()

    conn = get_connection()
    row = conn.execute(
        "SELECT id, name FROM auditors WHERE id = ? AND pin = ?",
        (auditor_id, pin),
    ).fetchone()
    conn.close()

    if row is None:
        return jsonify({"ok": False, "error": "Identifiant ou code PIN incorrect."}), 401

    return jsonify({"ok": True, "auditor": {"id": row["id"], "name": row["name"]}})


# ----------------------------------------------------------------------
# Écran ligne de production (Résultats)
# ----------------------------------------------------------------------
def _norm_line(section, line):
    """Cutting/finishing n'ont pas de ligne -> clé vide en base."""
    return line if section == "sewing" else ""


def _photo_list(value):
    """Lit les anciennes photos simples et les nouvelles listes JSON."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [value]
    except (TypeError, json.JSONDecodeError):
        return [value]


def _photo_json(value):
    photos = value if isinstance(value, list) else [value]
    return json.dumps([photo for photo in photos if photo], ensure_ascii=False)


def _text_list(value):
    """Lit les anciens commentaires simples et les nouveaux tableaux JSON."""
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [value]
    except (TypeError, json.JSONDecodeError):
        return [value]


def _text_json(value):
    comments = value if isinstance(value, list) else [value]
    return json.dumps([comment or "" for comment in comments], ensure_ascii=False)


def _has_text(value):
    values = value if isinstance(value, list) else [value]
    return any(str(comment or "").strip() for comment in values)


@app.route("/api/results")
def get_results():
    section = request.args.get("section", "sewing")
    line = _norm_line(section, request.args.get("line", "Line 01"))

    conn = get_connection()
    record = conn.execute(
        """SELECT * FROM audit_records
           WHERE section = ? AND line = ?
           ORDER BY id DESC LIMIT 1""",
        (section, line),
    ).fetchone()
    champion = conn.execute(
        "SELECT name, photo FROM champions WHERE section = ? AND line = ?",
        (section, line),
    ).fetchone()
    conn.close()

    if record is None:
        return jsonify({"ok": False, "error": "Aucun audit pour cette section/ligne."}), 404

    label = f"Sewing — {line}" if section == "sewing" else section.capitalize()

    return jsonify({
        "ok": True,
        "label": label,
        "record": {
            "id": record["id"],
            "points": record["points"],
            "rating": record["rating"],
            "before": _text_list(record["comment_before"]),
            "after": _text_list(record["comment_after"]),
            "improvement": record["improvement"],
            "photoBefore": _photo_list(record["photo_before"]),
            "photoAfter": _photo_list(record["photo_after"]),
        },
        "champion": {
            "name": champion["name"] if champion else "—",
            "photo": champion["photo"] if champion else None,
        },
    })


# ----------------------------------------------------------------------
# Nouvel audit
# ----------------------------------------------------------------------
@app.route("/api/audits", methods=["POST"])
def create_audit():
    data = request.get_json(silent=True) or {}

    section = data.get("section")
    if section not in ("cutting", "sewing", "finishing"):
        return jsonify({"ok": False, "error": "Section invalide."}), 400

    line = _norm_line(section, data.get("line", ""))
    if section == "sewing" and line not in LINES:
        return jsonify({"ok": False, "error": "Ligne invalide."}), 400

    photo_before = data.get("photoBefore")
    photo_after = data.get("photoAfter")
    comment_before = data.get("commentBefore")
    comment_after = data.get("commentAfter")
    if not _has_text(comment_before):
        return jsonify({"ok": False, "error": "Le commentaire Before est requis."}), 400
    if not _has_text(comment_after):
        return jsonify({"ok": False, "error": "Le commentaire After est requis."}), 400

    conn = get_connection()
    conn.execute(
        """INSERT INTO audit_records
           (section, line, auditor_id, photo_before, photo_after,
            comment_before, comment_after, rating, points, improvement)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            section,
            line,
            data.get("auditorId"),
            _photo_json(photo_before),
            _photo_json(photo_after),
            _text_json(data.get("commentBefore", "")),
            _text_json(data.get("commentAfter", "")),
            int(data.get("rating") or 0),
            int(data.get("points") or 0),
            data.get("improvement", ""),
        ),
    )
    conn.commit()
    conn.close()

    label = f"Sewing — {line}" if section == "sewing" else section.capitalize()
    return jsonify({"ok": True, "message": f"{label} : l'écran de la ligne a été mis à jour avec ce nouvel audit."})


@app.route("/api/audits")
def list_audits():
    conn = get_connection()
    rows = conn.execute(
        """SELECT a.*, au.name AS auditor_name
           FROM audit_records a LEFT JOIN auditors au ON au.id = a.auditor_id
           ORDER BY a.id DESC"""
    ).fetchall()
    conn.close()
    return jsonify({"ok": True, "audits": [
        {
            "id": row["id"], "section": row["section"], "line": row["line"],
            "auditor": row["auditor_name"] or row["auditor_id"] or "—",
            "createdAt": row["created_at"],
            "photoBefore": _photo_list(row["photo_before"]),
            "photoAfter": _photo_list(row["photo_after"]),
            "commentBefore": _text_list(row["comment_before"]),
            "commentAfter": _text_list(row["comment_after"]),
            "rating": row["rating"], "points": row["points"],
            "improvement": row["improvement"] or "",
        }
        for row in rows
    ]})


@app.route("/api/audits/<int:audit_id>", methods=["PUT", "DELETE"])
def manage_audit(audit_id):
    conn = get_connection()
    existing = conn.execute("SELECT id FROM audit_records WHERE id = ?", (audit_id,)).fetchone()
    if existing is None:
        conn.close()
        return jsonify({"ok": False, "error": "Audit introuvable."}), 404

    if request.method == "DELETE":
        conn.execute("DELETE FROM audit_records WHERE id = ?", (audit_id,))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})

    data = request.get_json(silent=True) or {}
    fields = {
        "comment_before": _text_json(data.get("commentBefore", "")),
        "comment_after": _text_json(data.get("commentAfter", "")),
        "rating": int(data.get("rating") or 0),
        "points": int(data.get("points") or 0),
        "improvement": data.get("improvement", ""),
    }
    if data.get("photoBefore"):
        fields["photo_before"] = _photo_json(data["photoBefore"])
    if data.get("photoAfter"):
        fields["photo_after"] = _photo_json(data["photoAfter"])
    assignments = ", ".join(f"{key} = ?" for key in fields)
    conn.execute(f"UPDATE audit_records SET {assignments} WHERE id = ?", (*fields.values(), audit_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ----------------------------------------------------------------------
# Champions 5S
# ----------------------------------------------------------------------
@app.route("/api/champions")
def list_champions():
    conn = get_connection()
    rows = conn.execute("SELECT section, line, name, photo FROM champions").fetchall()
    conn.close()
    return jsonify({
        "ok": True,
        "champions": [
            {"section": r["section"], "line": r["line"], "name": r["name"], "photo": r["photo"]}
            for r in rows
        ],
    })


@app.route("/api/champions", methods=["POST"])
def save_champion():
    data = request.get_json(silent=True) or {}
    section = data.get("section")
    if section not in ("cutting", "sewing", "finishing"):
        return jsonify({"ok": False, "error": "Section invalide."}), 400

    line = _norm_line(section, data.get("line", ""))
    name = (data.get("name") or "").strip()
    photo = data.get("photo")  # peut être None -> on ne change pas la photo existante

    conn = get_connection()
    existing = conn.execute(
        "SELECT id, name, photo FROM champions WHERE section = ? AND line = ?",
        (section, line),
    ).fetchone()

    if existing is None:
        conn.execute(
            "INSERT INTO champions (section, line, name, photo) VALUES (?, ?, ?, ?)",
            (section, line, name or "Sans nom", photo),
        )
    else:
        new_name = name or existing["name"]
        new_photo = photo if photo else existing["photo"]
        conn.execute(
            "UPDATE champions SET name = ?, photo = ? WHERE id = ?",
            (new_name, new_photo, existing["id"]),
        )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ----------------------------------------------------------------------

    #app.run(debug=True)
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)