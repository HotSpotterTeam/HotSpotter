from fastapi import APIRouter, status, Query, Path
from app.db import get_session
from app.models import Event
from app.api.api_models import CreateEvent
from geoalchemy2 import WKTElement
from datetime import datetime, time

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_events(
    location: str | None = Query(None), category: str | None = Query(None), status: str | None = Query(None)
):
    """Get all events (filters supported) - TBD"""
    with get_session() as session:
        events = session.query(Event).all()
        return {"status": "success", "data": [event.to_api_model() for event in events]}


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_event(id: str = Path(...)):
    """Get single event with all reports - TBD"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        return {"status": "success", "data": event.to_api_model()}


@router.post("/", status_code=status.HTTP_200_OK)
async def create_event(event: CreateEvent):
    """Create new event (protected)"""
    event_dict = event.model_dump(mode="json")
    event_dict["location"] = WKTElement(f"POINT({event_dict['location'][0]} {event_dict['location'][1]})")
    event_dict["date"] = datetime.fromisoformat(event_dict["date"])
    event_dict["time"] = time.fromisoformat(event_dict["time"])
    event_model = Event(**event_dict)
    with get_session() as session:
        session.add(event_model)
        session.commit()
        return {"status": "success", "data": event_model.to_api_model()}


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
