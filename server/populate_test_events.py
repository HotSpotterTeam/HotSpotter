#!/usr/bin/env python3
"""
Script to populate test events in the HotSpotter database.
These events are spread around the Tel Aviv area for testing purposes.

Usage:
    python populate_test_events.py [--count 50] [--owner-id 2] [--dry-run]
"""

import argparse
import random
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from geoalchemy2 import WKTElement

from app.models import Event
from app.db import get_session

# Event name templates
EVENT_NAMES = [
    "Yoga Session",
    "Live Music",
    "Dance Class",
    "Coffee Cupping",
    "Beer Festival",
    "Cycling Tour",
    "Beach Party",
    "Art Exhibition",
    "Craft Fair",
    "Open Mic",
    "Morning Meditation",
    "Farmers Market",
    "Summer Festival",
    "DJ Set",
    "Tech Meetup",
    "Night Market",
    "Tea Ceremony",
    "Comedy Night",
    "Cooking Workshop",
    "Street Performance",
    "Sunset Yoga",
    "Food Truck Rally",
    "Running Club",
]

# Event categories
CATEGORIES = ["music", "art", "food", "fitness", "tech", "party", "other"]

# Tel Aviv area bounding box
TEL_AVIV_BOUNDS = {
    "min_lat": 32.03,
    "max_lat": 32.13,
    "min_lng": 34.73,
    "max_lng": 34.82,
}


def random_location():
    """Generate a random location within Tel Aviv bounds."""
    lat = random.uniform(TEL_AVIV_BOUNDS["min_lat"], TEL_AVIV_BOUNDS["max_lat"])
    lng = random.uniform(TEL_AVIV_BOUNDS["min_lng"], TEL_AVIV_BOUNDS["max_lng"])
    return lat, lng


def random_times():
    """Generate random start and end times within the next 7 days."""
    now = datetime.now()
    # Start between now and 7 days from now
    start_offset = random.randint(-24, 168)  # -1 day to +7 days in hours
    start_time = now + timedelta(hours=start_offset)
    # Duration between 2 and 8 hours
    duration = random.randint(2, 8)
    end_time = start_time + timedelta(hours=duration)
    return start_time, end_time


def generate_events(count: int, owner_id: int):
    """Generate a list of test events."""
    events = []
    for i in range(1, count + 1):
        name_template = random.choice(EVENT_NAMES)
        name = f"{name_template} #{i}"
        category = random.choice(CATEGORIES)
        lat, lng = random_location()
        start_time, end_time = random_times()

        # Determine status based on times
        now = datetime.now()
        if end_time < now:
            status = "completed"
        elif start_time <= now <= end_time:
            status = "active"
        else:
            status = "pending-start"

        events.append({
            "name": name,
            "description": f"Join us for this amazing {category} event!",
            "category": category,
            "lat": lat,
            "lng": lng,
            "start_time": start_time,
            "end_time": end_time,
            "status": status,
            "owner_id": owner_id,
        })

    return events


def populate_events(events_data: list, dry_run: bool = False):
    """Insert events into the database."""
    if dry_run:
        print(f"\n[DRY RUN] Would create {len(events_data)} events:")
        for i, e in enumerate(events_data[:5], 1):
            print(f"  {i}. {e['name']} ({e['category']}) at ({e['lat']:.4f}, {e['lng']:.4f})")
        if len(events_data) > 5:
            print(f"  ... and {len(events_data) - 5} more")
        return

    session = get_session()
    try:
        created = 0
        for e in events_data:
            event = Event(
                name=e["name"],
                description=e["description"],
                category=e["category"],
                location=WKTElement(f"POINT({e['lng']} {e['lat']})", srid=4326),
                start_time=e["start_time"],
                end_time=e["end_time"],
                status=e["status"],
                owner_id=e["owner_id"],
            )
            session.add(event)
            created += 1

        session.commit()
        print(f"\n✅ Successfully created {created} test events")
    except Exception as ex:
        session.rollback()
        print(f"\n❌ Error creating events: {ex}")
        raise
    finally:
        session.close()


def delete_generated_events(owner_id: int, dry_run: bool = False):
    """Delete all events owned by the specified user (generated events)."""
    session = get_session()
    try:
        events = session.query(Event).filter(Event.owner_id == owner_id).all()
        count = len(events)

        if dry_run:
            print(f"\n[DRY RUN] Would delete {count} events owned by user {owner_id}")
            return count

        for e in events:
            session.delete(e)

        session.commit()
        print(f"\n✅ Deleted {count} events owned by user {owner_id}")
        return count
    except Exception as ex:
        session.rollback()
        print(f"\n❌ Error deleting events: {ex}")
        raise
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Populate test events in HotSpotter")
    parser.add_argument(
        "--count",
        type=int,
        default=50,
        help="Number of events to create (default: 50)",
    )
    parser.add_argument(
        "--owner-id",
        type=int,
        default=2,
        help="User ID to assign as owner (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't actually create, just show what would be created",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete existing generated events before creating new ones",
    )
    parser.add_argument(
        "--delete-only",
        action="store_true",
        help="Only delete existing generated events, don't create new ones",
    )

    args = parser.parse_args()

    print("🎉 HotSpotter Test Event Generator")
    print(f"   Count: {args.count}")
    print(f"   Owner ID: {args.owner_id}")
    print()

    if args.delete or args.delete_only:
        delete_generated_events(args.owner_id, dry_run=args.dry_run)
        if args.delete_only:
            print("\n✅ Done!")
            return

    events_data = generate_events(args.count, args.owner_id)
    populate_events(events_data, dry_run=args.dry_run)

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
