# OpenStreetMap POI Import Script

This script imports Points of Interest (POIs) from OpenStreetMap into the HotSpotter database's `spots` table.

## Prerequisites

1. Ensure the `spots` table exists (run migrations)

   ```bash
   alembic upgrade head
   ```

2. Ensure database is up and running

3. --owner-id is the user id from users table, if no users, login first to create one


## Usage

### Basic Import

Import all categories within a bounding box:

```bash
python import_osm_pois.py --bbox "32.0,34.7,32.2,34.9" --owner-id 2
```

### Import Specific Categories

```bash
python import_osm_pois.py --bbox "32.0,34.7,32.1,34.8" --categories beach,parking,museum
```

### Dry Run (Test Without Importing)

```bash
python import_osm_pois.py --bbox "32.0,34.7,32.1,34.8" --dry-run
```

## Parameters

### `--bbox` (Required)
Bounding box in the format: `"min_lat,min_lon,max_lat,max_lon"`

**How to find your bounding box:**
1. Go to [OpenStreetMap](https://www.openstreetmap.org/)
2. Navigate to your area of interest
3. Click "Export" in the top menu
4. The coordinates shown are your bounding box
5. Format as: `"south,west,north,east"`

**Examples:**
- Tel Aviv area: `"32.0,34.7,32.1,34.8"`
- Jerusalem area: `"31.7,35.1,31.8,35.3"`
- Haifa area: `"32.7,34.9,32.9,35.1"`

### `--categories` (Optional)
Comma-separated list of categories to import.

**Available categories:**
- `beach` - Natural beaches
- `shopping` - Shopping malls, markets, department stores
- `parking` - Parking lots and spaces
- `theatre` - Theatres
- `cinema` - Cinemas and movie theaters
- `arts_centre` - Arts centers
- `community_centre` - Community centers
- `conference_centre` - Conference centers
- `attraction` - Tourist attractions
- `stadium` - Stadiums
- `sports_centre` - Sports centers and gyms
- `museum` - Museums
- `gallery` - Art galleries
- `restaurant` - Restaurants
- `cafe` - Cafes and coffee shops
- `bar` - Bars and pubs
- `park` - Parks and green spaces

**Default:** All categories

### `--dry-run` (Optional)
Test mode - shows what would be imported without actually inserting into database.


## Output

The script will show:
1. How many elements were received from OSM
2. How many valid spots were parsed
3. How many spots were imported

Example output:
```
🗺️  OpenStreetMap POI Importer
   Bounding box: 32.0,34.7,32.1,34.8
   Categories: beach, shopping

Fetching data from OpenStreetMap...
📥 Received 45 elements from OSM
✨ Parsed 42 valid spots

✅ Successfully imported 38 spots
⏭️  Skipped 4 spots (already exist)

✅ Done!
```

## Database Schema

Imported spots will have:
- `title`: POI name from OSM
- `description`: OSM description/note (if available)
- `category`: Mapped category (beach, shopping, parking, theatre, cinema, museum, cafe, etc.)
- `location`: Geographic coordinates (PostGIS POINT)
- `address`: Extracted from OSM address tags
- `spot_type`: Always "permanent"
- `source`: Always "osm"
- `osm_id`: Unique OSM identifier (type/id)
- `osm_data`: Full OSM tags as JSONB
- `status`: Always "active"
- `created_at`, `updated_at`: Timestamp of import

## Troubleshooting

### Error: "Failed to start PostgreSQL"
Make sure your Docker PostgreSQL container is running:
```bash
docker ps | grep hotspotter-db
```

If not running, start it:
```bash
python create_local_db.py
```

### Error: "relation 'spots' does not exist"
Run the database migrations:
```bash
alembic upgrade head
```

### Error: "No spots to import"
The bounding box might be too small or in an area with no POIs. Try:
1. Expanding the bounding box
2. Using `--dry-run` to see what's being fetched
3. Checking [OpenStreetMap](https://www.openstreetmap.org/) to verify POIs exist in that area

### Timeout errors
The Overpass API has rate limits. If you get timeouts:
1. Reduce the bounding box size
2. Import fewer categories at once
3. Wait a few minutes between imports

## API Endpoints

After importing, you can access the spots via these endpoints:

- `GET /api/spots/` - List all spots (with filters)
- `GET /api/spots/{id}` - Get single spot
- `GET /api/spots/nearby/?lat=32.0&lon=34.7&radius=1000` - Get nearby spots
- `POST /api/spots/` - Create new spot
- `PUT /api/spots/{id}` - Update spot
- `DELETE /api/spots/{id}` - Delete spot

## Tips

1. **Start small**: Test with a small bounding box and `--dry-run` first
2. **Re-imports are safe**: The script skips existing OSM IDs, so you can re-run safely
3. **Update data**: To refresh OSM data, delete old spots and re-import
4. **Custom categories**: Edit the `CATEGORY_MAPPINGS` in the script to add more OSM tags

## Support

For issues or questions, check:
- [Overpass API Documentation](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OSM Tag Documentation](https://wiki.openstreetmap.org/wiki/Map_features)
