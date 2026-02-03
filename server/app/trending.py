from datetime import datetime, timedelta
from sqlalchemy import func, case, and_
from sqlalchemy.orm import Session
from app.models import Report, Event
import pytz
import time
import logging
from threading import Lock

logger = logging.getLogger(__name__)

ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")

# Simple in-memory cache with TTL
_trending_cache: dict[str, tuple[dict[int, int], float]] = {}
_cache_lock = Lock()
CACHE_TTL_SECONDS = 60  # Cache trending scores for 60 seconds


def _get_cached_scores(cache_key: str) -> dict[int, int] | None:
    """Get cached scores if not expired."""
    with _cache_lock:
        if cache_key in _trending_cache:
            scores, timestamp = _trending_cache[cache_key]
            if time.time() - timestamp < CACHE_TTL_SECONDS:
                return scores
            del _trending_cache[cache_key]
    return None


def _set_cached_scores(cache_key: str, scores: dict[int, int]):
    """Cache scores with current timestamp."""
    with _cache_lock:
        _trending_cache[cache_key] = (scores, time.time())
        # Cleanup old entries if cache gets too large
        if len(_trending_cache) > 1000:
            now = time.time()
            expired = [k for k, (_, ts) in _trending_cache.items() if now - ts > CACHE_TTL_SECONDS]
            for k in expired:
                del _trending_cache[k]


def get_time_now():
    """Get current time in Israel timezone as naive datetime"""
    return datetime.now(ISRAEL_TZ).replace(tzinfo=None)


def calculate_trending_score(spot_id: int = None, event_id: int = None, session: Session = None) -> int:
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

    # Get reports from last 7 days
    if spot_id:
        reports = session.query(Report).filter(Report.spot_id == spot_id, Report.date >= now - timedelta(days=7)).all()
    elif event_id:
        reports = (
            session.query(Report).filter(Report.event_id == event_id, Report.date >= now - timedelta(days=7)).all()
        )
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
        active_event = session.query(Event).filter(Event.spot_id == spot_id, Event.status == "active").first()
        if active_event:
            score += 25

    # 5. EVENT-SPECIFIC: Starting soon bonus (0-25 points)
    if event_id:
        event = session.query(Event).filter(Event.id == event_id).first()
        if event and event.start_time:
            minutes_until = (event.start_time - now).total_seconds() / 60

            if event.status == "active":
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


def calculate_trending_scores_batch(
    spot_ids: list[int] = None, event_ids: list[int] = None, session: Session = None
) -> dict[int, int]:
    """
    Calculate trending scores for multiple spots or events in a single batch query.
    Much faster than calling calculate_trending_score() multiple times.
    Uses SQL aggregations instead of fetching all reports.
    Results are cached for 60 seconds.

    Args:
        spot_ids: List of spot IDs to calculate scores for
        event_ids: List of event IDs to calculate scores for
        session: Database session

    Returns:
        Dictionary mapping entity_id -> trending_score
    """
    if not session:
        return {}

    if not spot_ids and not event_ids:
        return {}

    scores = {}
    uncached_spot_ids = []
    uncached_event_ids = []

    # Check cache for spots
    if spot_ids:
        for sid in spot_ids:
            cached = _get_cached_scores(f"spot:{sid}")
            if cached is not None:
                scores[sid] = cached.get(sid, 0)
            else:
                uncached_spot_ids.append(sid)

    # Check cache for events
    if event_ids:
        for eid in event_ids:
            cached = _get_cached_scores(f"event:{eid}")
            if cached is not None:
                scores[eid] = cached.get(eid, 0)
            else:
                uncached_event_ids.append(eid)

    # If everything was cached, return early
    if not uncached_spot_ids and not uncached_event_ids:
        return scores

    now = get_time_now()
    seven_days_ago = now - timedelta(days=7)
    twenty_four_hours_ago = now - timedelta(hours=24)

    # Calculate scores for spots
    if uncached_spot_ids:
        t0 = time.time()
        # Batch query for all spots' report metrics using SQL aggregations
        spot_report_metrics = (
            session.query(
                Report.spot_id,
                func.sum(case((Report.date >= twenty_four_hours_ago, 1), else_=0)).label("count_24h"),
                func.count(Report.id).label("count_7d"),
                func.avg(Report.score).label("avg_rating"),
                func.sum(case((Report.picture.isnot(None), 1), else_=0)).label("count_pictures"),
            )
            .filter(Report.spot_id.in_(uncached_spot_ids), Report.date >= seven_days_ago)
            .group_by(Report.spot_id)
            .all()
        )
        t1 = time.time()
        if t1 - t0 > 0.1:
            logger.info(f"[TRENDING] Spot report metrics query took {t1 - t0:.3f}s for {len(uncached_spot_ids)} spots")

        # Create a dict for quick lookup
        metrics_by_spot = {row.spot_id: row for row in spot_report_metrics}

        # Get active events for all spots in one query
        t0 = time.time()
        active_events_by_spot = (
            session.query(Event.spot_id).filter(Event.spot_id.in_(uncached_spot_ids), Event.status == "active").distinct().all()
        )
        t1 = time.time()
        if t1 - t0 > 0.1:
            logger.info(f"[TRENDING] Active events query took {t1 - t0:.3f}s")
        spots_with_active_events = {row.spot_id for row in active_events_by_spot}

        # Calculate scores for each spot
        for spot_id in uncached_spot_ids:
            score = 0
            metrics = metrics_by_spot.get(spot_id)

            if metrics:
                # 1. AMOUNT OF REPORTS (0-30 points)
                count_24h = metrics.count_24h or 0
                count_7d = metrics.count_7d or 0
                score += min(count_24h * 3, 15)
                score += min(count_7d * 1, 15)

                # 2. POSITIVENESS (0-20 points)
                if metrics.avg_rating is not None:
                    score += int(metrics.avg_rating * 4)

                # 3. PICTURE REPORTS (0-15 points)
                count_pictures = metrics.count_pictures or 0
                score += min(count_pictures * 3, 15)

            # 4. SPOT-SPECIFIC: Active event at spot (0-25 points)
            if spot_id in spots_with_active_events:
                score += 25

            final_score = min(score, 100)
            scores[spot_id] = final_score
            _set_cached_scores(f"spot:{spot_id}", {spot_id: final_score})

    # Calculate scores for events
    if uncached_event_ids:
        t0 = time.time()
        # Batch query for all events' report metrics using SQL aggregations
        event_report_metrics = (
            session.query(
                Report.event_id,
                func.sum(case((Report.date >= twenty_four_hours_ago, 1), else_=0)).label("count_24h"),
                func.count(Report.id).label("count_7d"),
                func.avg(Report.score).label("avg_rating"),
                func.sum(case((Report.picture.isnot(None), 1), else_=0)).label("count_pictures"),
            )
            .filter(Report.event_id.in_(uncached_event_ids), Report.date >= seven_days_ago)
            .group_by(Report.event_id)
            .all()
        )
        t1 = time.time()
        if t1 - t0 > 0.1:
            logger.info(f"[TRENDING] Event report metrics query took {t1 - t0:.3f}s for {len(uncached_event_ids)} events")

        # Create a dict for quick lookup
        metrics_by_event = {row.event_id: row for row in event_report_metrics}

        # Get event data (status, start_time) for all events in one query
        t0 = time.time()
        event_data_rows = session.query(Event.id, Event.status, Event.start_time).filter(Event.id.in_(uncached_event_ids)).all()
        t1 = time.time()
        if t1 - t0 > 0.1:
            logger.info(f"[TRENDING] Event data query took {t1 - t0:.3f}s")
        event_data_by_id = {row.id: row for row in event_data_rows}

        # Calculate scores for each event
        for event_id in uncached_event_ids:
            score = 0
            metrics = metrics_by_event.get(event_id)
            event_data = event_data_by_id.get(event_id)

            if metrics:
                # 1. AMOUNT OF REPORTS (0-30 points)
                count_24h = metrics.count_24h or 0
                count_7d = metrics.count_7d or 0
                score += min(count_24h * 3, 15)
                score += min(count_7d * 1, 15)

                # 2. POSITIVENESS (0-20 points)
                if metrics.avg_rating is not None:
                    score += int(metrics.avg_rating * 4)

                # 3. PICTURE REPORTS (0-15 points)
                count_pictures = metrics.count_pictures or 0
                score += min(count_pictures * 3, 15)

            # 5. EVENT-SPECIFIC: Starting soon bonus (0-25 points)
            if event_data and event_data.start_time:
                minutes_until = (event_data.start_time - now).total_seconds() / 60

                if event_data.status == "active":
                    score += 25
                elif 0 <= minutes_until <= 60:
                    score += 20
                elif 60 < minutes_until <= 180:
                    score += 10

            final_score = min(score, 100)
            scores[event_id] = final_score
            _set_cached_scores(f"event:{event_id}", {event_id: final_score})

    return scores


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
