# HotSpotter API (scaffold)

This directory contains a small FastAPI scaffold for the HotSpotter API. The endpoints are placeholders that return a JSON object with {"status":"TBD"}. No real logic or persistence is implemented.

Quick start (macOS / zsh):

```bash
# from repo root
cd server

# create venv (optional but recommended)
python3 -m venv .venv
source .venv/bin/activate

# install dependencies
pip install -r requirements.txt

Create a .env file in the server directory with the following variables:
DATABASE_URL="Secret connection string to the db sent on WhatsApp"

# start dev server
uvicorn app.main:app --reload --port 8000
```

Open http://127.0.0.1:8000/docs to explore the auto-generated OpenAPI UI.

Notes:

- All endpoints return a simple JSON placeholder: {"status": "TBD"}.
- Implementations, authentication, DB, and validation are intentionally left as TODOs.

## Database migrations (Alembic)

Alembic is configured under `alembic/` and reads `DATABASE_URL` from your environment (or `.env`).

Common commands (run from the `server` directory with the virtualenv activated):

```bash
# create a new revision
alembic revision -m "describe change"

# apply migrations
alembic upgrade head

# roll back the last migration
alembic downgrade -1
```

The generated migration scripts live in `alembic/versions/`.
