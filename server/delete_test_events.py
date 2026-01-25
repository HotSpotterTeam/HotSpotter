#!/usr/bin/env python3
"""
Script to delete generated test events from the HotSpotter database.

Usage:
    python delete_test_events.py [--owner-id 2] [--dry-run]
"""

import argparse
from app.db import get_session
from app.models import Event


def delete_generated_events(owner_id: int, dry_run: bool = False):
    """Delete all events owned by the specified user (generated events)."""
    session = get_session()
    try:
        events = session.query(Event).filter(Event.owner_id == owner_id).all()
        count = len(events)

        if count == 0:
            print(f"No events found for owner_id={owner_id}")
            return 0

        print(f"Found {count} events owned by user {owner_id}:")
        for e in events[:10]:
            print(f"  - {e.id}: {e.name} ({e.status})")
        if count > 10:
            print(f"  ... and {count - 10} more")

        if dry_run:
            print(f"\n[DRY RUN] Would delete {count} events")
            return count

        for e in events:
            session.delete(e)

        session.commit()
        print(f"\n✅ Deleted {count} events")
        return count
    except Exception as ex:
        session.rollback()
        print(f"\n❌ Error deleting events: {ex}")
        raise
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Delete generated test events")
    parser.add_argument(
        "--owner-id",
        type=int,
        default=2,
        help="User ID whose events to delete (default: 2)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't actually delete, just show what would be deleted",
    )

    args = parser.parse_args()

    print("🗑️  HotSpotter Test Event Deleter")
    print(f"   Owner ID: {args.owner_id}")
    print()

    delete_generated_events(args.owner_id, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
