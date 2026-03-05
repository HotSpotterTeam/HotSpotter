#!/usr/bin/env python3
"""
Script to import Points of Interest (POIs) from OpenStreetMap into the spots table.

This script uses the Overpass API to query OpenStreetMap data for specific categories
(beaches, malls, parking, venues) within a given bounding box and imports them as spots.

Usage:
    python import_osm_pois.py --bbox "min_lat,min_lon,max_lat,max_lon" --categories beach,mall,parking,venue
    
Example:
    python import_osm_pois.py --bbox "32.0,34.7,32.1,34.8" --categories beach,mall
"""

import requests
import json
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Any
import time
import random

# Database imports
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Spot
from geoalchemy2 import WKTElement
import os

# Load environment variables
DATABASE_URL_LOCAL = os.environ.get("DATABASE_URL_LOCAL", "postgresql://postgres:postgres@localhost:5432/hotspotter")

# Overpass API endpoints (fallbacks for timeouts/overload)
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
]

# Mapping of our categories to OSM tags
CATEGORY_MAPPINGS = {
    "beach": {
        "tags": [
            {"natural": "beach"},
        ],
    },
    "shopping": {
        "tags": [
            {"shop": "mall"},
            {"amenity": "marketplace"},
            {"shop": "department_store"},
        ],
    },
    "parking": {
        "tags": [
            {"amenity": "parking"},
            {"amenity": "parking_space"},
        ],
    },
    "theatre": {
        "tags": [
            {"amenity": "theatre"},
        ],
    },
    "cinema": {
        "tags": [
            {"amenity": "cinema"},
        ],
    },
    "arts_centre": {
        "tags": [
            {"amenity": "arts_centre"},
        ],
    },
    "community_centre": {
        "tags": [
            {"amenity": "community_centre"},
        ],
    },
    "conference_centre": {
        "tags": [
            {"amenity": "conference_centre"},
        ],
    },
    "attraction": {
        "tags": [
            {"tourism": "attraction"},
        ],
    },
    "stadium": {
        "tags": [
            {"leisure": "stadium"},
        ],
    },
    "sports_centre": {
        "tags": [
            {"leisure": "sports_centre"},
        ],
    },
    "museum": {
        "tags": [
            {"tourism": "museum"},
        ],
    },
    "gallery": {
        "tags": [
            {"tourism": "gallery"},
        ],
    },
    "restaurant": {
        "tags": [
            {"amenity": "restaurant"},
        ],
    },
    "cafe": {
        "tags": [
            {"amenity": "cafe"},
        ],
    },
    "bar": {
        "tags": [
            {"amenity": "bar"},
        ],
    },
    "park": {
        "tags": [
            {"leisure": "park"},
        ],
    },
}


def build_overpass_query(bbox: str, categories: List[str]) -> str:
    """
    Build an Overpass QL query for the specified categories and bounding box.
    
    Args:
        bbox: Bounding box as "min_lat,min_lon,max_lat,max_lon"
        categories: List of category names to query
    
    Returns:
        Overpass QL query string
    """
    query_parts = []
    
    for category in categories:
        if category not in CATEGORY_MAPPINGS:
            print(f"Warning: Unknown category '{category}', skipping...")
            continue
        
        for tag_dict in CATEGORY_MAPPINGS[category]["tags"]:
            for key, value in tag_dict.items():
                # Query both nodes and ways
                query_parts.append(f'node["{key}"="{value}"]({bbox});')
                query_parts.append(f'way["{key}"="{value}"]({bbox});')
    
    query = f"""
    [out:json][timeout:60];
    (
        {chr(10).join(query_parts)}
    );
    out center;
    """
    
    return query


def fetch_osm_data(query: str, max_retries: int = 5) -> Dict[str, Any]:
    """
    Fetch data from Overpass API.
    
    Args:
        query: Overpass QL query string
    
    Returns:
        JSON response from Overpass API
    """
    print("Fetching data from OpenStreetMap...")
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        overpass_url = OVERPASS_URLS[(attempt - 1) % len(OVERPASS_URLS)]
        try:
            response = requests.post(overpass_url, data={"data": query}, timeout=120)
            if response.status_code in {429, 502, 503, 504}:
                raise requests.exceptions.HTTPError(
                    f"{response.status_code} Server Error: {response.reason} for url: {overpass_url}",
                    response=response,
                )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            last_error = e
            if attempt == max_retries:
                break
            backoff = min(60, (2 ** (attempt - 1))) + random.uniform(0, 1)
            print(
                "Overpass request failed (attempt "
                f"{attempt}/{max_retries}) via {overpass_url}: {e}"
            )
            print(f"Retrying in {backoff:.1f}s...")
            time.sleep(backoff)

    print(f"Error fetching data from Overpass API after {max_retries} attempts: {last_error}")
    sys.exit(1)


def determine_category(tags: Dict[str, str]) -> str:
    """
    Determine the spot category based on OSM tags.
    
    Args:
        tags: Dictionary of OSM tags
    
    Returns:
        Category name (e.g., 'beach', 'shopping', 'parking', 'theatre', 'museum', etc.)
    """
    for category, mapping in CATEGORY_MAPPINGS.items():
        for tag_dict in mapping["tags"]:
            if all(tags.get(k) == v for k, v in tag_dict.items()):
                return category
    return "other"


def parse_osm_element(element: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Parse an OSM element into a spot dictionary.
    
    Args:
        element: OSM element from Overpass API response
    
    Returns:
        Dictionary with spot data, or None if element is invalid
    """
    tags = element.get("tags", {})
    
    # Get coordinates
    if element["type"] == "node":
        lat = element.get("lat")
        lon = element.get("lon")
    elif element["type"] == "way" and "center" in element:
        lat = element["center"].get("lat")
        lon = element["center"].get("lon")
    else:
        return None
    
    if lat is None or lon is None:
        return None
    
    # Get name
    name = tags.get("name") or tags.get("name:en") or f"OSM {element['type']} {element['id']}"
    
    # Get category
    category = determine_category(tags)
    
    # Get address components
    address_parts = []
    if "addr:street" in tags:
        street = tags["addr:street"]
        if "addr:housenumber" in tags:
            street = f"{tags['addr:housenumber']} {street}"
        address_parts.append(street)
    if "addr:city" in tags:
        address_parts.append(tags["addr:city"])
    
    address = ", ".join(address_parts) if address_parts else None
    
    # Get description
    description = tags.get("description") or tags.get("note")
    
    return {
        "name": name[:255],  # Changed from "title" to "name"
        "description": description,
        "category": category,
        "lat": lat,
        "lon": lon,
        "address": address,
        "osm_id": f"{element['type']}/{element['id']}",
        "osm_data": tags,
    }


def import_spots_to_db(spots_data: List[Dict[str, Any]], owner_id: int, dry_run: bool = False):  # Added owner_id parameter
    """Import spots into the database."""
    if dry_run:
        print(f"\n[DRY RUN] Would import {len(spots_data)} spots:")
        for i, spot in enumerate(spots_data[:5], 1):
            print(f"  {i}. {spot['name']} ({spot['category']}) at ({spot['lat']}, {spot['lon']})")  # Changed title to name
        if len(spots_data) > 5:
            print(f"  ... and {len(spots_data) - 5} more")
        return
    
    # Create database connection
    engine = create_engine(DATABASE_URL_LOCAL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        imported = 0
        skipped = 0
        
        for spot_data in spots_data:
            existing = session.query(Spot).filter(Spot.osm_id == spot_data["osm_id"]).first()
            if existing:
                skipped += 1
                continue
            
            now = datetime.now()
            spot = Spot(
                name=spot_data["name"],  # Changed from title
                description=spot_data["description"],
                category=spot_data["category"],
                location=WKTElement(f"POINT({spot_data['lon']} {spot_data['lat']})", srid=4326),
                address=spot_data["address"],
                spot_type="permanent",
                source="osm",
                osm_id=spot_data["osm_id"],
                osm_data=spot_data["osm_data"],
                owner_id=owner_id,  # Added owner_id
                is_approved=True,  # Changed from status="active" - auto-approve OSM imports
                created_at=now,
                updated_at=now,
            )
            
            session.add(spot)
            imported += 1
        
        session.commit()
        print(f"\n✅ Successfully imported {imported} spots")
        if skipped > 0:
            print(f"⏭️  Skipped {skipped} spots (already exist)")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error importing spots: {e}")
        raise
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(
        description="Import POIs from OpenStreetMap into the spots table"
    )
    parser.add_argument(
        "--bbox",
        required=True,
        help="Bounding box as 'min_lat,min_lon,max_lat,max_lon' (e.g., '32.0,34.7,32.1,34.8')",
    )
    parser.add_argument(
        "--categories",
        default="beach,shopping,parking,theatre,cinema,arts_centre,community_centre,conference_centre,attraction,stadium,sports_centre,museum,gallery,restaurant,cafe,bar,park",
        help="Comma-separated list of categories to import (default: all)",
    )
    parser.add_argument(
        "--owner-id",  # Added owner-id argument
        type=int,
        default=1,
        help="User ID to assign as owner of imported spots (default: 1)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't actually import, just show what would be imported",
    )
    
    args = parser.parse_args()
    
    categories = [c.strip() for c in args.categories.split(",")]
    
    print(f"🗺️  OpenStreetMap POI Importer")
    print(f"   Bounding box: {args.bbox}")
    print(f"   Categories: {', '.join(categories)}")
    print(f"   Owner ID: {args.owner_id}")  # Show owner ID
    print()
    
    query = build_overpass_query(args.bbox, categories)
    data = fetch_osm_data(query)
    
    print(f"📥 Received {len(data.get('elements', []))} elements from OSM")
    
    spots_data = []
    for element in data.get("elements", []):
        spot_data = parse_osm_element(element)
        if spot_data:
            spots_data.append(spot_data)
    
    print(f"✨ Parsed {len(spots_data)} valid spots")
    
    if spots_data:
        import_spots_to_db(spots_data, args.owner_id, dry_run=args.dry_run)  # Pass owner_id
    else:
        print("⚠️  No spots to import")
    
    print("\n✅ Done!")


if __name__ == "__main__":
    main()
