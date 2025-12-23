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
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5432/hotspotter"
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

## Populating Spots from OpenStreetMap

To populate your database with real POI (Points of Interest) data from OpenStreetMap:

1. **Apply all database migrations:**
```bash
alembic upgrade head
```

2. **Create a user account** (you need a user ID):
   - Start the server: `uvicorn app.main:app --reload --port 8000`
   - Log in via Google OAuth or create a user through the API
   - Note your user ID from the response

3. **Run the OSM import script:**
```bash
# Replace bbox with your desired area (min_lat,min_lng,max_lat,max_lng)
# Replace owner-id with your user ID
python import_osm_pois.py --bbox "32.7,34.9,32.9,35.1" --owner-id 1
```

**Example bounding boxes:**
- Tel Aviv area: `"32.0,34.7,32.2,34.9"`
- Haifa area: `"32.7,34.9,32.9,35.1"`

**Note:** The owner-id parameter must be a valid user ID from your database. All imported spots will be automatically approved and assigned to this user.

For more details, see [OSM_IMPORT_README.md](OSM_IMPORT_README.md).