# HotSpotter API (scaffold)

This directory contains a small FastAPI scaffold for the HotSpotter API. The endpoints are placeholders that return a JSON object with {"status":"TBD"}. No real logic or persistence is implemented.

Quick start:

````bash
# from repo root
cd server

# create venv (optional but recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

Create a .env file in the server directory with the following variables:
DATABASE_URL="Secret connection string to the db sent on WhatsApp"

# start dev server
uvicorn app.main:app --reload --port 8000

# Local database setup:

# create local database (works on Windows and Mac/Linux)
python create_local_db.py
# OR on Mac/Linux:
# ./create_local_db.sh

Add the following to your .env file:
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5440/hotspotter"
LOCAL_DB=true

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
````

The generated migration scripts live in `alembic/versions/`.

# generate jwt secret key
```bash
- python -c "import secrets; print(secrets.token_urlsafe(32))"
````
- copy and add it to your .env file with JWT_SECRET_KEY= "your_key"


```

```
