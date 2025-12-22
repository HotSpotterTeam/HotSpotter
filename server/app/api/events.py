from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_
from app.db import get_session
from app.models import Event, User, Spot, Report
from app.api.api_models import CreateEvent, EventsResponse, EventResponse, UpdateEvent
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from datetime import date, datetime, time

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_events(
    search: str | None = Query(None, description="Search text in event name"),
    category: str | None = Query(None), 
    status: str = Query("active", description="Status to filter by (default: active)"),
    owner_id: int | None = Query(None, description="Filter by event creator"),
    spot_id: int | None = Query(None, description="Filter by attached spot"),
    sort_by: str | None = Query("creation", description="Options: 'creation', 'reports'"),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    radius: float = Query(5000, description="Radius in meters"),
    min_lat: float | None = Query(None, description="Minimum latitude for bounding box"),
    max_lat: float | None = Query(None, description="Maximum latitude for bounding box"),
    min_lng: float | None = Query(None, description="Minimum longitude for bounding box"),
    max_lng: float | None = Query(None, description="Maximum longitude for bounding box")
) -> EventsResponse:
    """
    Get all events.
    - Default status is 'active' (hides pending).
    - Managers/Creators can fetch 'pending' by passing ?status=pending
    """
    with get_session() as session:
        query = session.query(Event)

        # 1. Standard Filters
        if status:
            query = query.filter(Event.status == status)
        if category:
            query = query.filter(Event.category == category)
        if search:
            query = query.filter(Event.name.ilike(f"%{search}%"))
        
        # 2. Ownership Filters- for Pending Events logic
        if owner_id:
            query = query.filter(Event.owner_id == owner_id)
        if spot_id:
            query = query.filter(Event.spot_id == spot_id)

        # 3. Radius Filter (PostGIS)
        if lat is not None and lng is not None:
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Event.location, user_point, radius))

        # If all 4 corners are provided, find events INSIDE that box
        if min_lat and max_lat and min_lng and max_lng:
            # ST_MakeEnvelope takes (xmin, ymin, xmax, ymax, srid)
            # x = lng, y = lat
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            query = query.filter(func.ST_Within(Event.location, bbox))
        
        # Keep existing Radius Logic (Only run if Bbox wasn't used, or combine them)
        elif lat is not None and lng is not None:
             user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
             query = query.filter(func.ST_DWithin(Event.location, user_point, radius))

        # 4. Sorting
        if sort_by == "reports":
            # Join with Reports table and count them
            query = query.outerjoin(Report).group_by(Event.id).order_by(func.count(Report.id).desc())
        else:
            # Default: Creation time (Newest ID = Newest Time)
            query = query.order_by(Event.id.desc())

        events = query.all()
        return EventsResponse(status="success", data=[event.to_api_model() for event in events])

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_event(id: int = Path(...)) -> EventResponse:
    """Get single event"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        return EventResponse(status="success", data=event.to_api_model())


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: CreateEvent,
    current_user: User = Depends(get_current_user)
) -> EventResponse:
    """
    Create new event.
    - spot_id provided? -> status='pending' (unless user owns the spot)
    - Duration defaults to 24h if not provided.
    """
    # 1. Duration Logic (1h to 168h)
    duration = 24 # Default
    if hasattr(event_data, "duration_hours") and event_data.duration_hours:
         duration = event_data.duration_hours
    
    if duration < 1 or duration > 168:
        raise HTTPException(status_code=400, detail="Duration must be 1-168 hours")

    # 2. Prepare Data
    event_dict = event_data.model_dump(mode="json")
    
    # Cleanup dictionary (remove fields handled manually)
    if "spot_id" in event_dict and event_dict["spot_id"] is None:
        del event_dict["spot_id"]
    if "duration_hours" in event_dict:
        del event_dict["duration_hours"]

    # PostGIS Location
    event_dict["location"] = WKTElement(f"POINT({event_dict['location'][0]} {event_dict['location'][1]})")
    
    # Parse Date/Time
    if isinstance(event_dict["date"], str):
        event_dict["date"] = datetime.fromisoformat(event_dict["date"])
    if isinstance(event_dict["time"], str):
        event_dict["time"] = time.fromisoformat(event_dict["time"])

    with get_session() as session:
        # 3. Status Logic
        initial_status = "active"
        if event_data.spot_id:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if not spot:
                raise HTTPException(status_code=404, detail="Spot not found")
            
            # Auto-approve if I own the spot
            if spot.owner_id == current_user.id:
                initial_status = "active"
            else:
                initial_status = "pending"

        # 4. Save to DB
        event_model = Event(
            name=event_data.name,
            description=event_data.description,
            location=event_dict["location"],
            date=event_dict["date"],
            time=event_dict["time"],
            category=event_data.category,
            status=initial_status,
            owner_id=current_user.id,
            spot_id=event_data.spot_id if event_data.spot_id else None,
            duration_hours=duration
        )

        session.add(event_model)
        session.commit()
        session.refresh(event_model)
        return EventResponse(status="success", data=event_model.to_api_model())


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_event(
    event_update: UpdateEvent,
    id: int = Path(...),
    current_user: User = Depends(get_current_user)
):
    """Update event details"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        # Permission Check
        if event.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to update this event")
            
        update_data = event_update.model_dump(exclude_unset=True)
        
        # Handle Date/Time conversion if they are in the update data
        if "date" in update_data and isinstance(update_data["date"], str):
             update_data["date"] = date.fromisoformat(update_data["date"])
        if "time" in update_data and isinstance(update_data["time"], str):
             update_data["time"] = time.fromisoformat(update_data["time"])

        # Apply updates
        for key, value in update_data.items():
            setattr(event, key, value)
        
        session.commit()
        session.refresh(event)
        return EventResponse(status="success", data=event.to_api_model())


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_event(
    id: int = Path(...),
    current_user: User = Depends(get_current_user)
):
    """Delete event (Cascades to reports via DB model)"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
            
        if event.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to delete this event")
            
        session.delete(event)
        session.commit()
        return {"status": "success", "message": "Event deleted"}


@router.put("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_event(
    id: int = Path(...),
    current_user: User = Depends(get_current_user)
):
    """
    Approve an event at a spot. 
    Only the SPOT OWNER can approve events at their spot.
    """
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if not event.spot_id:
            raise HTTPException(status_code=400, detail="This event is not attached to a spot")

        # Find the spot to check ownership
        spot = session.query(Spot).filter(Spot.id == event.spot_id).first()
        
        # Security: Only Spot Owner or Admin
        if spot.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Only the spot manager can approve this event")
        
        if event.status == "active":
            return {"status": "success", "message": "Event is already active"}

        event.status = "active"
        session.commit()
        return {"status": "success", "message": "Event approved and active"}
    

