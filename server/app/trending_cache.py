"""
In-memory cache for trending scores.
Scores are calculated in batch and cached, avoiding per-request DB queries.
"""
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models import Report, Event, Spot
import pytz

ISRAEL_TZ = pytz.timezone('Asia/Jerusalem')

# In-memory cache
_spot_scores: Dict[int, int] = {}
_event_scores: Dict[int, int] = {}
_last_updated: Optional[datetime] = None
CACHE_TTL_SECONDS = 60  # Refresh every minute


def get_time_now():
    return datetime.now(ISRAEL_TZ).replace(tzinfo=None)


def get_cached_trending_score(spot_id: int = None, event_id: int = None) -> int:
    """Get trending score from cache. Returns 0 if not cached."""
    if spot_id:
        return _spot_scores.get(spot_id, 0)
    if event_id:
        return _event_scores.get(event_id, 0)
    return 0


def refresh_all_trending_scores(session: Session):
    """
    Batch calculate all trending scores in minimal queries.
    Called by scheduler every minute.
    """
    global _spot_scores, _event_scores, _last_updated

    now = get_time_now()
    week_ago = now - timedelta(days=7)
    day_ago = now - timedelta(hours=24)

    print("[TRENDING CACHE] Refreshing all trending scores...")

    # Reset caches
    new_spot_scores: Dict[int, int] = {}
    new_event_scores: Dict[int, int] = {}

    # Get all spots and events
    all_spots = session.query(Spot).filter(Spot.is_approved == True).all()
    all_events = session.query(Event).filter(Event.status.in_(['active', 'pending-start'])).all()

    # Get all recent reports in ONE query
    recent_reports = session.query(Report).filter(Report.date >= week_ago).all()

    # Group reports by spot_id and event_id
    spot_reports: Dict[int, list] = {}
    event_reports: Dict[int, list] = {}

    for r in recent_reports:
        if r.spot_id:
            spot_reports.setdefault(r.spot_id, []).append(r)
        if r.event_id:
            event_reports.setdefault(r.event_id, []).append(r)

    # Get active events by spot_id for spot bonus
    active_events_by_spot: Dict[int, bool] = {}
    for e in all_events:
        if e.status == 'active' and e.spot_id:
            active_events_by_spot[e.spot_id] = True

    # Calculate spot scores
    for spot in all_spots:
        score = 0
        reports = spot_reports.get(spot.id, [])

        # Reports in last 24h (3 points each, max 15)
        reports_24h = [r for r in reports if r.date >= day_ago]
        score += min(len(reports_24h) * 3, 15)

        # Reports in last 7 days (1 point each, max 15)
        score += min(len(reports), 15)

        # Average rating (0-20 points)
        rated = [r for r in reports if r.score]
        if rated:
            avg = sum(r.score for r in rated) / len(rated)
            score += int(avg * 4)

        # Pictures (3 points each, max 15)
        pics = [r for r in reports if r.picture]
        score += min(len(pics) * 3, 15)

        # Active event bonus (25 points)
        if active_events_by_spot.get(spot.id):
            score += 25

        new_spot_scores[spot.id] = min(score, 100)

    # Calculate event scores
    for event in all_events:
        score = 0
        reports = event_reports.get(event.id, [])

        # Reports scoring (same as spots)
        reports_24h = [r for r in reports if r.date >= day_ago]
        score += min(len(reports_24h) * 3, 15)
        score += min(len(reports), 15)

        rated = [r for r in reports if r.score]
        if rated:
            avg = sum(r.score for r in rated) / len(rated)
            score += int(avg * 4)

        pics = [r for r in reports if r.picture]
        score += min(len(pics) * 3, 15)

        # Event timing bonus
        if event.status == 'active':
            score += 25
        elif event.start_time:
            mins_until = (event.start_time - now).total_seconds() / 60
            if 0 <= mins_until <= 60:
                score += 20
            elif 60 < mins_until <= 180:
                score += 10

        new_event_scores[event.id] = min(score, 100)

    # Update cache atomically
    _spot_scores = new_spot_scores
    _event_scores = new_event_scores
    _last_updated = now

    print(f"[TRENDING CACHE] Updated {len(_spot_scores)} spots, {len(_event_scores)} events")


def is_cache_stale() -> bool:
    """Check if cache needs refresh."""
    if _last_updated is None:
        return True
    return (get_time_now() - _last_updated).total_seconds() > CACHE_TTL_SECONDS
