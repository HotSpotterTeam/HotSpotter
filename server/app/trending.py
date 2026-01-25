from sqlalchemy.orm import Session
from app.trending_cache import get_cached_trending_score


def calculate_trending_score(
        spot_id: int = None,
        event_id: int = None,
        session: Session = None
) -> int:
    """
    Get trending score from cache (0-100).

    Scores are batch-calculated by a background job every minute.
    This function simply retrieves from cache for O(1) performance.
    """
    return get_cached_trending_score(spot_id=spot_id, event_id=event_id)


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