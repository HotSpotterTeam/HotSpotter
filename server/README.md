# HotSpotter



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
DATABASE_URL=''
DATABASE_URL_LOCAL="postgresql://postgres:postgres@localhost:5432/hotspotter"
LOCAL_DB=true
GOOGLE_CLIENT_ID=141144789026-m90rfocsbhngcds5rhnrpn6uaso48tc1.apps.googleusercontent.com
JWT_SECRET_KEY=''


# Local database setup:

# create local database (works on Windows and Mac/Linux needs Docker)
python create_local_db.py
# OR on Mac/Linux:
# ./create_local_db.sh

# start dev server
uvicorn app.main:app --reload --port 8000

# you can see the api:
API docs (OpenAPI): http://127.0.0.1:8000/docs


# generate jwt secret key
```bash
- python -c "import secrets; print(secrets.token_urlsafe(32))"
````
- copy and add it to your .env file with JWT_SECRET_KEY= "your_key"

## Populating Spots from OpenStreetMap

To populate your database with real POI (Points of Interest) data from OpenStreetMap:

1. **Create a user account** (you need a user ID):
   - Start the server: `uvicorn app.main:app --reload --port 8000`
   - Log in via Google OAuth or create a user through the API
   - Note your user ID from the response

2. **Run the OSM import script:**
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