from fastapi import APIRouter, status
from sqlalchemy import func
from app.db import get_session
from app.models import Spot, Event
from typing import List

router = APIRouter()

@router.get("/categories", status_code=status.HTTP_200_OK, response_model=List[str])
async def get_categories():
    """
    Fetches a list of all unique categories from both Spots and Events.
    """
    with get_session() as session:
        # Get distinct categories from Spots where category is not null
        spot_categories = session.query(func.distinct(Spot.category)).filter(Spot.category.isnot(None)).all()
        # Get distinct categories from Events where category is not null
        event_categories = session.query(func.distinct(Event.category)).filter(Event.category.isnot(None)).all()
        # Extract categories from query results
        spot_cats = [c[0] for c in spot_categories]
        event_cats = [c[0] for c in event_categories]
        # Combine, remove duplicates, and sort
        all_categories = sorted(list(set(spot_cats + event_cats)))

        return all_categories


@router.get("/navigation/{eventId}", status_code=status.HTTP_200_OK)
async def navigation(eventId: str):
        return {"status": "TBD", "endpoint": f"/api/navigation/{eventId}"}