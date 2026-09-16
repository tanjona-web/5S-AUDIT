"""
Couche d'accès aux données (SQLite, module standard sqlite3 — aucune
dépendance externe autre que Flask).
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "5s_audit.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS auditors (
    id    TEXT PRIMARY KEY,
    pin   TEXT NOT NULL,
    name  TEXT NOT NULL,
    role  TEXT NOT NULL DEFAULT 'Auditeur 5S'
);

CREATE TABLE IF NOT EXISTS champions (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    line    TEXT NOT NULL DEFAULT '',   -- '' pour cutting / finishing
    name    TEXT NOT NULL,
    photo   TEXT,                       -- data URL base64 ou NULL
    UNIQUE(section, line)
);

CREATE TABLE IF NOT EXISTS audit_records (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    section        TEXT NOT NULL,
    line           TEXT NOT NULL DEFAULT '',
    auditor_id     TEXT,
    photo_before   TEXT,
    photo_after    TEXT,
    comment_before TEXT,
    comment_after  TEXT,
    rating         INTEGER DEFAULT 0,
    points         INTEGER DEFAULT 0,
    improvement    TEXT,
    created_at     TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(auditor_id) REFERENCES auditors(id)
);
"""

LINES = [f"Line {str(i).zfill(2)}" for i in range(1, 9)]

# Données de démonstration reprises telles quelles du prototype front-end.
SEED_AUDITORS = [
    ("TANJONA", "1234", "USER", "IE Officer GSP"),
    ("USER", "1234", "User", "Auditeur 5S"),
    ("TSAROANA", "1234", "TSAROANA", "IE Officer 5S"),
    ("NIRINA3", "1357", "Nirina L.", "Responsable qualité"),
]

SEED_CHAMPIONS = [
    ("cutting", "", "Rakoto H."),
    ("finishing", "", "Voahangy R."),
    ("sewing", "Line 01", "Fara N."),
    ("sewing", "Line 02", "Tojo A."),
    ("sewing", "Line 03", "Nirina L."),
    ("sewing", "Line 04", "Hasina P."),
    ("sewing", "Line 05", "Miora S."),
    ("sewing", "Line 06", "Andry K."),
    ("sewing", "Line 07", "Lalao V."),
    ("sewing", "Line 08", "Rivo M."),
]

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Crée les tables si besoin et insère les données de démo une seule fois."""
    conn = get_connection()
    conn.executescript(SCHEMA)

    auditor_columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(auditors)")
    }
    if "role" not in auditor_columns:
        conn.execute("ALTER TABLE auditors ADD COLUMN role TEXT NOT NULL DEFAULT 'Auditeur 5S'")

    tanjona = next((auditor for auditor in SEED_AUDITORS if auditor[0] == "TANJONA"), None)
    legacy_fara = conn.execute(
        "SELECT id FROM auditors WHERE id = 'FARA01'"
    ).fetchone()
    current_tanjona = conn.execute(
        "SELECT id FROM auditors WHERE id = 'TANJONA'"
    ).fetchone()
    if tanjona and legacy_fara and not current_tanjona:
        _, pin, name, role = tanjona
        conn.execute(
            "INSERT INTO auditors (id, pin, name, role) VALUES (?, ?, ?, ?)",
            ("TANJONA", pin, name, role),
        )
        conn.execute(
            "UPDATE audit_records SET auditor_id = 'TANJONA' WHERE auditor_id = 'FARA01'"
        )
        conn.execute("DELETE FROM auditors WHERE id = 'FARA01'")

    conn.executemany(
        "UPDATE auditors SET role = ? WHERE id = ? AND role = 'Auditeur 5S'",
        [(role, auditor_id) for auditor_id, _, _, role in SEED_AUDITORS],
    )

    # Supprime les anciens résultats de démonstration créés par les versions précédentes.
    conn.execute("DELETE FROM audit_records WHERE auditor_id IS NULL")

    conn.executemany(
        "INSERT OR IGNORE INTO auditors (id, pin, name, role) VALUES (?, ?, ?, ?)",
        SEED_AUDITORS,
    )

    has_champions = conn.execute("SELECT COUNT(*) AS n FROM champions").fetchone()["n"] > 0
    if not has_champions:
        conn.executemany(
            "INSERT INTO champions (section, line, name, photo) VALUES (?, ?, ?, NULL)",
            SEED_CHAMPIONS,
        )
    conn.commit()
    conn.close()
