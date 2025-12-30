from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_
from app.db import get_session
from app.models import Event, User, Spot, Report
from app.api.api_models import CreateEvent, EventsResponse, EventResponse, UpdateEvent
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from datetime import date, datetime, time, timedelta

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

        if search:
            conditions = [
                Event.name.ilike(f"%{search}%"),
                Event.description.ilike(f"%{search}%"),
                Event.status.ilike(f"%{search}%"),
            ]
            if search.isdigit():
                conditions.append(Event.id == int(search))
                conditions.append(Event.owner_id == int(search)) # Search by Owner
                conditions.append(Event.spot_id == int(search))  # Search by Spot connection
            
            query = query.filter(or_(*conditions))

        # 1. Standard Filters
        if status and status != "all": 
            query = query.filter(Event.status == status)
        if category:
            query = query.filter(Event.category == category)
        # Note: search filter is already applied above with OR logic (lines 37-48)

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
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            query = query.filter(func.ST_Within(Event.location, bbox))

        # Keep existing Radius Logic (Only run if Bbox wasn't used, or combine them)
        elif lat is not None and lng is not None:
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Event.location, user_point, radius))

        # 4. Sorting
        if sort_by == "reports":
            query = query.outerjoin(Report).group_by(Event.id).order_by(func.count(Report.id).desc())
        else:
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
    - Must provide EITHER spot_id OR custom_location (not both, not neither)
    - If spot_id: Link to existing spot, status='pending' unless user owns the spot
    - If custom_location: Event stored at custom location with spot_id=null, status='active'
    - Validates end_time > start_time
    """

    # 1. Validate spot_id XOR custom_location
    has_spot = event_data.spot_id is not None
    has_custom = event_data.custom_location is not None and len(event_data.custom_location) == 2

    if not has_spot and not has_custom:
        raise HTTPException(
            status_code=400,
            detail="Must provide either spot_id or custom_location"
        )

    if has_spot and has_custom:
        raise HTTPException(
            status_code=400,
            detail="Cannot provide both spot_id and custom_location"
        )

    # 2. Parse and validate times
    try:
        start_time = datetime.fromisoformat(event_data.start_time)
        end_time = datetime.fromisoformat(event_data.end_time)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid datetime format. Use ISO format: YYYY-MM-DDTHH:MM:SS"
        )

    if end_time <= start_time:
        raise HTTPException(
            status_code=400,
            detail="end_time must be after start_time"
        )

    with get_session() as session:
        location_wkt = None
        final_spot_id = None
        initial_status = "active"

        # 3. Handle spot_id case - link to existing permanent spot
        if has_spot:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if not spot:
                raise HTTPException(status_code=404, detail="Spot not found")

            location_wkt = spot.location
            final_spot_id = spot.id

            # Auto-approve if user owns the spot
            if spot.owner_id == current_user.id:
                initial_status = "active"
            else:
                initial_status = "pending"

        # 4. Handle custom_location case - event at custom location without spot
        else:
            lng, lat = event_data.custom_location[0], event_data.custom_location[1]
            location_wkt = WKTElement(f"POINT({lng} {lat})", srid=4326)
            final_spot_id = None
            initial_status = "active"

        # 5. Create the event
        event_model = Event(
            name=event_data.name,
            description=event_data.description,
            location=location_wkt,
            start_time=start_time,
            end_time=end_time,
            category=event_data.category,
            status=initial_status,
            owner_id=current_user.id,
            spot_id=final_spot_id
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

        # Handle start_time/end_time conversion if they are in the update data
        if "start_time" in update_data and isinstance(update_data["start_time"], str):
            update_data["start_time"] = datetime.fromisoformat(update_data["start_time"])
        if "end_time" in update_data and isinstance(update_data["end_time"], str):
            update_data["end_time"] = datetime.fromisoformat(update_data["end_time"])

        # Validate time ordering if both are being updated
        start = update_data.get("start_time", event.start_time)
        end = update_data.get("end_time", event.end_time)
        if end <= start:
            raise HTTPException(
                status_code=400,
                detail="end_time must be after start_time"
            )

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

        spot = session.query(Spot).filter(Spot.id == event.spot_id).first()

        # Security: Only Spot Owner or Admin
        if spot.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Only the spot manager can approve this event")

        if event.status == "active":
            return {"status": "success", "message": "Event is already active"}

        event.status = "active"
        session.commit()
        return {"status": "success", "message": "Event approved and active"}