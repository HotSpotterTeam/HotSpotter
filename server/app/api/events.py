from fastapi import APIRouter, status, Query, Path

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_events(
    location: str | None = Query(None), category: str | None = Query(None), status: str | None = Query(None)
):
    """Get all events (filters supported) - TBD"""
    return {"status": "TBD", "endpoint": "/api/events"}


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_event(id: str = Path(...)):
    """Get single event with all reports - TBD"""
    return {"status": "TBD", "endpoint": f"/api/events/{id}"}


@router.post("/", status_code=status.HTTP_200_OK)
async def create_event():
    """Create new event (protected) - TBD"""
    return {"status": "TBD", "endpoint": "/api/events"}


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_event(id: str = Path(...)):
    """Update event (protected, owner/admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/events/{id}"}


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_event(id: str = Path(...)):
    """Delete event (protected, admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/events/{id}"}


@router.get("/nearby", status_code=status.HTTP_200_OK)
async def nearby_events(
    lat: float | None = Query(None), lng: float | None = Query(None), radius: float | None = Query(None)
):
    """Get events near coordinates - TBD"""
    return {"status": "TBD", "endpoint": "/api/events/nearby"}


@router.put("/{id}/verify", status_code=status.HTTP_200_OK)
async def verify_event(id: str = Path(...)):
    """Verify event (admin only) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/events/{id}/verify"}


# create report for an event (matches POST /api/events/:eventId/reports)
@router.post("/{eventId}/reports", status_code=status.HTTP_200_OK)
async def create_report_for_event(eventId: str = Path(...)):
    """Create new report for event (protected, supports file upload) - TBD"""
    return {"status": "TBD", "endpoint": f"/api/events/{eventId}/reports"}
