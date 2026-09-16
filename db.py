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
    ("TOJO02", "2580", "Tojo A.", "Superviseur production"),
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

SEED_RESULTS = [
    ("cutting", "", 412, 4,
     "Chutes de tissu accumulées autour de la table de coupe.",
     "Zone dégagée, chutes triées dans les bacs dédiés.",
     "Étiqueter les bacs de chutes par type de tissu pour accélérer le tri."),
    ("finishing", "", 365, 3,
     "Cartons d'emballage empilés devant l'issue de secours.",
     "Issue dégagée, cartons stockés dans la zone marquée au sol.",
     "Repeindre le marquage au sol de la zone carton, devenu peu visible."),
    ("sewing", "Line 01", 480, 5,
     "Fils et chutes au sol autour des machines à coudre.",
     "Poste nettoyé, fils collectés, sol dégagé.",
     "Fixer un support mural pour les bobines de fil en attente."),
    ("sewing", "Line 02", 298, 3,
     "Outils de maintenance laissés sur le poste après réglage.",
     "Outils rangés dans la caisse à outils identifiée.",
     "Ajouter une ombre de rangement pour chaque outil sur le tableau."),
    ("sewing", "Line 03", 356, 4,
     "Étiquettes de production mélangées entre deux commandes.",
     "Étiquettes séparées et classées par ordre de fabrication.",
     "Installer un séparateur physique entre les bacs de commandes."),
    ("sewing", "Line 04", 410, 4,
     "Câblage électrique au sol proche du poste opérateur.",
     "Câbles regroupés et fixés le long du bâti de la machine.",
     "Prévoir une gaine de protection pour les câbles au sol restants."),
    ("sewing", "Line 05", 271, 2,
     "Chariot de pièces en cours non identifié, mélangé aux rebuts.",
     "Chariot étiqueté « En cours » et séparé des rebuts.",
     "Créer une zone dédiée et marquée pour les pièces en cours."),
    ("sewing", "Line 06", 389, 3,
     "Consommables (huile machine) stockés sans rétention.",
     "Bac de rétention installé sous les contenants d'huile.",
     "Commander des étiquettes de danger pour les contenants d'huile."),
    ("sewing", "Line 07", 455, 5,
     "Poste globalement propre, léger surplus de tissu en attente.",
     "Surplus redistribué, poste conforme au standard 5S.",
     "Documenter ce poste comme référence pour les autres lignes."),
    ("sewing", "Line 08", 322, 3,
     "Panneau d'instructions de poste illisible et décollé.",
     "Panneau réimprimé et refixé, lisible à distance.",
     "Plastifier les panneaux d'instructions pour éviter l'usure."),
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

    already_seeded = conn.execute("SELECT COUNT(*) AS n FROM auditors").fetchone()["n"] > 0
    if not already_seeded:
        conn.executemany(
            "INSERT INTO auditors (id, pin, name, role) VALUES (?, ?, ?, ?)", SEED_AUDITORS
        )
        conn.executemany(
            "INSERT INTO champions (section, line, name, photo) VALUES (?, ?, ?, NULL)",
            SEED_CHAMPIONS,
        )
        conn.executemany(
            """INSERT INTO audit_records
               (section, line, auditor_id, photo_before, photo_after,
                comment_before, comment_after, rating, points, improvement)
               VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)""",
            [
                (sec, line, before, after, rating, points, improvement)
                for (sec, line, points, rating, before, after, improvement) in SEED_RESULTS
            ],
        )
    conn.commit()
    conn.close()
