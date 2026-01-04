from datetime import datetime
import pytz
from app.db import get_session
from app.models import Event
import logging

logger = logging.getLogger(__name__)

# Define Israel timezone
ISRAEL_TZ = pytz.timezone('Asia/Jerusalem')


def get_time_now():
    """Get current time in Israel timezone as naive datetime"""
    return datetime.now(ISRAEL_TZ).replace(tzinfo=None)


def update_event_statuses():
    """
    Update event statuses based on current Israel time.

    Rules:
    - pending          → waiting for approval (NEVER auto-changed)
    - pending-start    → approved, waiting for start_time
    - active           → event is happening
    - completed        → event ended
    """
    now = get_time_now()

    with get_session() as session:
        updated_counts = {
            "to_pending-start": 0,
            "to_active": 0,
            "to_completed": 0,
            "total": 0
        }

        # ONLY approved events
        events = session.query(Event).filter(
            Event.status.in_(["pending-start", "active"])
        ).all()

        logger.info(f"Checking {len(events)} approved events at {now} (Israel time)")

        for event in events:
            old_status = event.status
            new_status = old_status

            start_time = event.start_time
            end_time = event.end_time

            # Completed always wins
            if end_time < now:
                new_status = "completed"

            # Start event
            elif start_time <= now < end_time:
                new_status = "active"

            # Still waiting
            elif start_time > now:
                new_status = "pending-start"

            if new_status != old_status:
                event.status = new_status
                updated_counts[f"to_{new_status}"] += 1
                updated_counts["total"] += 1

                logger.info(
                    f"Event {event.id} ({event.name}) "
                    f"{old_status} → {new_status} "
                    f"(start={start_time}, end={end_time}, now={now})"
                )

        if updated_counts["total"] > 0:
            session.commit()
            logger.info(f"Event status update complete: {updated_counts}")
        else:
            logger.info("No event status updates needed")

        return updated_counts


def get_event_status_summary():
    """
    Get a summary of current event statuses.

    Returns:
        dict: Count of events by status
    """
    with get_session() as session:
        from sqlalchemy import func

        status_counts = session.query(
            Event.status,
            func.count(Event.id)
        ).group_by(Event.status).all()

        summary = {status: count for status, count in status_counts}
        summary["total"] = sum(summary.values())

        return summary