from fastapi import APIRouter, status, Path

router = APIRouter()


@router.get("/categories", status_code=status.HTTP_200_OK)
async def categories():
    """Get all event categories - TBD"""
    return {"status": "TBD", "endpoint": "/api/categories"}


@router.get("/navigation/{eventId}", status_code=status.HTTP_200_OK)
async def navigation(eventId: str = Path(...)):
    """Get navigation link for event (Google Maps/Waze) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/navigation/{eventId}"}
