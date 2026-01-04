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
    - Events with start_time in the future: status = 'pending'
    - Events with start_time in the past and end_time in the future: status = 'active'
    - Events with end_time in the past: status = 'completed'

    Returns:
        dict: Summary of updates performed
    """
    now = get_time_now()

    with get_session() as session:
        updated_counts = {
            "to_pending": 0,
            "to_active": 0,
            "to_completed": 0,
            "total": 0
        }

        # Get all events that are not cancelled
        events = session.query(Event).filter(
            Event.status.in_(['active', 'pending', 'completed'])
        ).all()

        logger.info(f"Checking {len(events)} events for status updates at {now} (Israel time)")

        for event in events:
            old_status = event.status
            new_status = None

            # Event times are stored as naive datetimes in Israel timezone
            start_time = event.start_time
            end_time = event.end_time

            # Determine new status based on time
            if end_time < now:
                new_status = 'completed'
            elif start_time <= now < end_time:
                new_status = 'active'
            elif start_time > now:
                new_status = 'pending'

            # Log comparison for debugging
            if new_status != old_status:
                logger.info(
                    f"Event {event.id} ({event.name}): "
                    f"start={start_time}, end={end_time}, now={now}, "
                    f"old_status={old_status}, new_status={new_status}"
                )

            # Update if status changed
            if new_status and new_status != old_status:
                event.status = new_status
                updated_counts[f"to_{new_status}"] += 1
                updated_counts["total"] += 1

                logger.info(
                    f"Event {event.id} ({event.name}) status updated: "
                    f"{old_status} -> {new_status}"
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