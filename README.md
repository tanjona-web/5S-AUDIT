# 5S Audit — Confection Textile (Flask)

Backend Flask + base de données SQLite pour l'application 5S front-end.
Le front-end (HTML/CSS/JS) est celui de votre prototype d'origine — seule
la logique de données a été déplacée côté serveur, via une petite API REST.

## Installation

```bash
python3 -m venv venv
source venv/bin/activate      # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

## Lancement

```bash
python app.py
```

Puis ouvrez **http://127.0.0.1:5000** dans le navigateur.

La base SQLite (`5s_audit.db`) est créée et pré-remplie automatiquement au
premier lancement, avec les mêmes données de démo que le prototype
(auditeurs, résultats d'audit, champions 5S par section).

## Comptes auditeurs de démo

| Identifiant | Code PIN |
|---|---|
| FARA01  | 1234 |
| TOJO02  | 2580 |
| NIRINA3 | 1357 |

## Structure du projet

```
5s_flask_app/
├── app.py                 # routes Flask + API REST
├── db.py                  # accès SQLite + schéma + données de démo
├── requirements.txt
├── templates/
│   └── index.html         # front-end (structure/CSS du prototype)
└── static/
    └── js/
        └── app.js         # logique front-end, connectée à l'API
```

## API REST

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/login` | `{id, pin}` → authentifie un auditeur |
| GET  | `/api/results?section=&line=` | dernier audit publié + champion pour l'écran ligne |
| POST | `/api/audits` | publie un nouvel audit (photos en base64, commentaires, note, points, amélioration) |
| GET  | `/api/champions` | liste tous les champions 5S |
| POST | `/api/champions` | crée/modifie le nom et/ou la photo d'un champion |

## Notes importantes

- Les photos sont envoyées et stockées en **base64** (comme dans le
  prototype front-end original) directement en base de données. Pour une
  mise en production réelle avec beaucoup de photos, il serait préférable
  de les stocker comme fichiers sur disque (ou un stockage objet) et de ne
  garder que l'URL en base — dites-le-moi si vous voulez que je fasse
  cette évolution.
- L'authentification actuelle est simplifiée (PIN en clair, pas de
  session/cookie signé) — convient pour une démo/prototype interne, mais
  à durcir avant un déploiement en production (hash du PIN, sessions
  Flask, HTTPS, etc.).
- Le serveur de développement Flask (`app.run(debug=True)`) ne doit pas
  être utilisé tel quel en production — utilisez un serveur WSGI comme
  gunicorn ou waitress.
