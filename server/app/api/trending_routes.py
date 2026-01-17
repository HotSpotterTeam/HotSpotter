from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db import get_session
from app.trending import (
    get_spot_trending_data,
    get_event_trending_data
)
from typing import List
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Simple in-memory cache
trending_cache = {}
CACHE_DURATION_SECONDS = 300  # 5 minutes


class TrendingResponse(BaseModel):
    activity_score: int
    quality_score: float | None
    metrics: dict


class BatchTrendingResponse(BaseModel):
    spots: dict[int, TrendingResponse]
    events: dict[int, TrendingResponse]


def get_cached_or_calculate(cache_key: str, calculator_func):
    """
    Get from cache or calculate and cache the result.

    Args:
        cache_key: Unique key for this calculation
        calculator_func: Function to call if not cached

    Returns:
        Cached or freshly calculated result
    """
    now = datetime.now()

    if cache_key in trending_cache:
        cached_data, cached_time = trending_cache[cache_key]
        if (now - cached_time).total_seconds() < CACHE_DURATION_SECONDS:
            return cached_data

    # Calculate fresh data
    result = calculator_func()
    trending_cache[cache_key] = (result, now)

    return result


@router.get("/spots/{spot_id}/trending", response_model=TrendingResponse)
async def get_spot_trending(spot_id: int):
    """
    Get trending data for a specific spot.

    Returns activity score, quality score, and detailed metrics.
    """
    with get_session() as session:
        try:
            cache_key = f"spot_{spot_id}"
            data = get_cached_or_calculate(
                cache_key,
                lambda: get_spot_trending_data(spot_id, session)
            )

            return TrendingResponse(
                activity_score=data['activity_score'],
                quality_score=data['quality_score'],
                metrics=data['metrics']
            )
        except Exception as e:
            logger.error(f"Error calculating trending for spot {spot_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to calculate trending data")


@router.get("/events/{event_id}/trending", response_model=TrendingResponse)
async def get_event_trending(event_id: int):
    """
    Get trending data for a specific event.

    Returns activity score, quality score, and detailed metrics.
    """
    with get_session() as session:
        try:
            cache_key = f"event_{event_id}"
            data = get_cached_or_calculate(
                cache_key,
                lambda: get_event_trending_data(event_id, session)
            )

            return TrendingResponse(
                activity_score=data['activity_score'],
                quality_score=data['quality_score'],
                metrics=data['metrics']
            )
        except Exception as e:
            logger.error(f"Error calculating trending for event {event_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to calculate trending data")


@router.get("/batch", response_model=BatchTrendingResponse)
async def get_trending_batch(
        spot_ids: List[int] = Query(default=[]),
        event_ids: List[int] = Query(default=[])
):
    """
    Get trending data for multiple spots and events in a single request.

    This is optimized for map loading where you need trending data
    for many markers at once.

    Query params:
        spot_ids: List of spot IDs
        event_ids: List of event IDs

    Returns:
        Dictionary with spots and events trending data
    """
    with get_session() as session:
        spots_data = {}
        events_data = {}

        # Calculate trending for all spots
        for spot_id in spot_ids:
            try:
                cache_key = f"spot_{spot_id}"
                data = get_cached_or_calculate(
                    cache_key,
                    lambda sid=spot_id: get_spot_trending_data(sid, session)
                )

                spots_data[spot_id] = TrendingResponse(
                    activity_score=data['activity_score'],
                    quality_score=data['quality_score'],
                    metrics=data['metrics']
                )
            except Exception as e:
                logger.error(f"Error calculating trending for spot {spot_id}: {e}")
                # Continue with other spots even if one fails
                continue

        # Calculate trending for all events
        for event_id in event_ids:
            try:
                cache_key = f"event_{event_id}"
                data = get_cached_or_calculate(
                    cache_key,
                    lambda eid=event_id: get_event_trending_data(eid, session)
                )

                events_data[event_id] = TrendingResponse(
                    activity_score=data['activity_score'],
                    quality_score=data['quality_score'],
                    metrics=data['metrics']
                )
            except Exception as e:
                logger.error(f"Error calculating trending for event {event_id}: {e}")
                # Continue with other events even if one fails
                continue

        return BatchTrendingResponse(
            spots=spots_data,
            events=events_data
        )


@router.delete("/cache")
async def clear_trending_cache():
    """
    Clear the trending data cache.

    Useful for development or if you need to force recalculation.
    """
    trending_cache.clear()
    return {"status": "success", "message": "Trending cache cleared"}