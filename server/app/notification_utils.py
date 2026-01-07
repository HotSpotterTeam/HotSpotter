from app.db import get_session
from app.models import Notification
from datetime import datetime, timezone


def create_notification(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    related_id: int = None
):
    """
    Create a notification for a user.
    
    Args:
        user_id: The user to notify
        notification_type: Type of notification (spot_approved, event_approved, report_flagged, etc.)
        title: Short title for the notification
        message: Detailed message
        related_id: ID of the related entity (spot_id, event_id, report_id, etc.)
    """
    with get_session() as session:
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_id=related_id,
            is_read=False,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        
        session.add(notification)
        session.commit()
        session.refresh(notification)
        
        return notification


def notify_spot_approved(spot_id: int, spot_name: str, owner_id: int):
    """Notify user that their spot was approved."""
    return create_notification(
        user_id=owner_id,
        notification_type="spot_approved",
        title="Spot Approved",
        message=f"Your spot '{spot_name}' has been approved and is now visible on the map!",
        related_id=spot_id
    )


def notify_event_approved(event_id: int, event_name: str, owner_id: int):
    """Notify user that their event was approved."""
    return create_notification(
        user_id=owner_id,
        notification_type="event_approved",
        title="Event Approved",
        message=f"Your event '{event_name}' has been approved and is now active!",
        related_id=event_id
    )


def notify_report_flagged(report_id: int, report_description: str, owner_id: int):
    """Notify user that their report was flagged as inappropriate."""
    return create_notification(
        user_id=owner_id,
        notification_type="report_flagged",
        title="Report Flagged",
        message=f"Your report has been flagged as inappropriate and removed: '{report_description[:50]}...'",
        related_id=report_id
    )
