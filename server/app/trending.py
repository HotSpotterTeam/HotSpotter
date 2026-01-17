from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models import Report, Event
import pytz

ISRAEL_TZ = pytz.timezone('Asia/Jerusalem')


def get_time_now():
    """Get current time in Israel timezone as naive datetime"""
    return datetime.now(ISRAEL_TZ).replace(tzinfo=None)


def calculate_trending_score(
        spot_id: int = None,
        event_id: int = None,
        session: Session = None
) -> int:
    """
    Calculate a simple trending score (0-100) based on:
    - Amount of reports (recent = more weight)
    - Positiveness of reports (star ratings)
    - Picture reports bonus
    - Active event at spot (for spots)
    - Event starting soon (for events)

    Returns integer score 0-100
    """
    if not session:
        return 0

    now = get_time_now()
    score = 0

    # DEBUG: Log what we're calculating
    entity_type = "spot" if spot_id else "event"
    entity_id = spot_id or event_id
    print(f"[TRENDING] Calculating for {entity_type} {entity_id}")

    # Get reports from last 7 days
    if spot_id:
        reports = session.query(Report).filter(
            Report.spot_id == spot_id,
            Report.date >= now - timedelta(days=7)
        ).all()
    elif event_id:
        reports = session.query(Report).filter(
            Report.event_id == event_id,
            Report.date >= now - timedelta(days=7)
        ).all()
    else:
        return 0

    # 1. AMOUNT OF REPORTS (0-30 points)
    # Reports in last 24 hours worth 3 points each
    reports_24h = [r for r in reports if r.date >= now - timedelta(hours=24)]
    score += min(len(reports_24h) * 3, 15)

    # Reports in last 7 days worth 1 point each
    score += min(len(reports) * 1, 15)

    # 2. POSITIVENESS (0-20 points)
    # Average star rating of recent reports
    rated_reports = [r for r in reports if r.score]
    if rated_reports:
        avg_rating = sum(r.score for r in rated_reports) / len(rated_reports)
        # Convert 1-5 scale to 0-20 points
        # 5 stars = 20 points, 3 stars = 12 points, 1 star = 4 points
        score += int(avg_rating * 4)

    # 3. PICTURE REPORTS (0-15 points)
    # Pictures show engagement
    picture_reports = [r for r in reports if r.picture]
    score += min(len(picture_reports) * 3, 15)

    # 4. SPOT-SPECIFIC: Active event at spot (0-25 points)
    if spot_id:
        active_event = session.query(Event).filter(
            Event.spot_id == spot_id,
            Event.status == 'active'
        ).first()
        if active_event:
            score += 25

    # 5. EVENT-SPECIFIC: Starting soon bonus (0-25 points)
    if event_id:
        event = session.query(Event).filter(Event.id == event_id).first()
        if event and event.start_time:
            minutes_until = (event.start_time - now).total_seconds() / 60

            if event.status == 'active':
                # Event is happening now
                score += 25
            elif 0 <= minutes_until <= 60:
                # Starting in next hour
                score += 20
            elif 60 < minutes_until <= 180:
                # Starting in next 3 hours
                score += 10

    # Cap at 100
    final_score = min(score, 100)
    return final_score


def get_icon_size_multiplier(trending_score: int) -> float:
    """
    Convert trending score (0-100) to icon size multiplier (1.0-2.0)

    0-20: 1.0x (small)
    21-40: 1.25x
    41-60: 1.5x
    61-80: 1.75x
    81-100: 2.0x (large)
    """
    if trending_score <= 20:
        return 1.0
    elif trending_score <= 40:
        return 1.25
    elif trending_score <= 60:
        return 1.5
    elif trending_score <= 80:
        return 1.75
    else:
        return 2.0