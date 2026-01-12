from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_
from app.db import get_session
from app.models import Event, User, Spot, Report
from app.api.api_models import CreateEvent, EventsResponse, EventResponse, UpdateEvent
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from datetime import date, datetime, time, timedelta , timezone
import pytz
from app.notification_utils import notify_event_approved, notify_event_created_at_spot

LOCAL_TZ = pytz.timezone('Asia/Jerusalem')

from app.hs_logging import log_user_action, get_request_session_id

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
        max_lng: float | None = Query(None, description="Maximum longitude for bounding box"),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100)
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
        # 5. Pagination
        total_count = query.count()
        offset = (page - 1) * limit
        events = query.offset(offset).limit(limit).all()

        return EventsResponse(
            status="success", 
            data=[event.to_api_model() for event in events],
            total=total_count
        )

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
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
) -> EventResponse:

    # 1. Validate spot_id XOR custom_location
    has_spot = event_data.spot_id is not None
    has_custom = event_data.custom_location is not None and len(event_data.custom_location) == 2

    if has_spot == has_custom:
        raise HTTPException(
            status_code=400,
            detail="Must provide either spot_id or custom_location (but not both)"
        )

    # 2. Parse times
    try:
        start_time = datetime.fromisoformat(event_data.start_time)
        end_time = datetime.fromisoformat(event_data.end_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid datetime format")

    if end_time <= start_time:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    with get_session() as session:
        location_wkt = None
        final_spot_id = None
        is_approved = False
        spot_owner_to_notify = None
        spot_name_for_notification = None

        # 3. Spot event
        if has_spot:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if not spot:
                raise HTTPException(status_code=404, detail="Spot not found")

            location_wkt = spot.location
            final_spot_id = spot.id

            if spot.owner_id == current_user.id or spot.category in ["beach", "park"]:
                is_approved = True
            else:
                # Someone else's spot - need to notify owner
                spot_owner_to_notify = spot.owner_id
                spot_name_for_notification = spot.name

        # 4. Custom location event
        else:
            lng, lat = event_data.custom_location
            location_wkt = WKTElement(f"POINT({lng} {lat})", srid=4326)
            final_spot_id = None
            is_approved = True

        # 5. Resolve final status
        initial_status = resolve_event_status(
            is_approved=is_approved,
            start_time=start_time,
            end_time=end_time
        )

        # 6. Create event
        event = Event(
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

        session.add(event)
        session.commit()
        session.refresh(event)

        log_user_action(
            "create_event",
            current_user,
            new_data=event.to_api_model(),
            request_session_id=request_session_id
        )

        # 7. Send notification to spot owner if needed
        if spot_owner_to_notify and spot_name_for_notification:
            from app.notification_utils import notify_event_created_at_spot
            notify_event_created_at_spot(
                event.id,
                event.name,
                spot_name_for_notification,
                spot_owner_to_notify
            )

        return EventResponse(status="success", data=event.to_api_model())


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_event(
        event_update: UpdateEvent,
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """Update event details"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Permission Check
        if event.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to update this event")

        # Store old data for logging
        old_data = event.to_api_model()
        
        update_data = event_update.model_dump(exclude_unset=True)

        # Handle Custom Location with SRID
        if "custom_location" in update_data:
            loc = update_data.pop("custom_location")
            if loc and len(loc) == 2:
                # Frontend sends [lng, lat] for custom_location (GeoJSON style)
                event.location = WKTElement(f"POINT({loc[0]} {loc[1]})", srid=4326)

        # If critical info changes and it's attached to a spot, reset to pending
        # (Unless the user is the spot owner or admin)
        critical_fields = ["name", "description", "start_time", "end_time", "category"]
        is_critical_change = any(field in update_data for field in critical_fields)
        
        if is_critical_change and event.spot_id:
            # Check if current user owns the spot
            spot = session.query(Spot).filter(Spot.id == event.spot_id).first()
            if spot and spot.owner_id != current_user.id:
                event.status = "pending"

        # Handle start_time/end_time conversion
        if "start_time" in update_data and isinstance(update_data["start_time"], str):
            update_data["start_time"] = datetime.fromisoformat(update_data["start_time"])
        if "end_time" in update_data and isinstance(update_data["end_time"], str):
            update_data["end_time"] = datetime.fromisoformat(update_data["end_time"])

        # Validate time ordering
        start = update_data.get("start_time", event.start_time)
        end = update_data.get("end_time", event.end_time)
        if end <= start:
            raise HTTPException(status_code=400, detail="end_time must be after start_time")

        # Apply remaining updates
        for key, value in update_data.items():
            setattr(event, key, value)

        session.commit()
        session.refresh(event)
        log_user_action("update_event", current_user, new_data=event.to_api_model(), request_session_id=request_session_id, old_data=old_data)
        return EventResponse(status="success", data=event.to_api_model())


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_event(
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """Delete event (Cascades to reports via DB model)"""
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to delete this event")

        # Store deleted data for logging
        deleted_data = event.to_api_model()
        
        session.delete(event)
        session.commit()
        log_user_action("delete_event", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": "Event deleted"}


@router.put("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_event(
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
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

        event.status = resolve_event_status(
            is_approved=True,
            start_time=event.start_time,
            end_time=event.end_time
        )
        session.commit()
        log_user_action("approve_event", current_user, new_data=event.to_api_model(),
                        request_session_id=request_session_id)

        # Send notification to event owner
        from app.notification_utils import notify_event_approved
        notify_event_approved(event.id, event.name, event.owner_id)

        return {"status": "success", "message": "Event approved and active"}


def resolve_event_status(is_approved: bool, start_time: datetime, end_time: datetime) -> str:
    now = datetime.utcnow()

    if not is_approved:
        return "pending"

    if end_time < now:
        return "completed"

    if start_time > now:
        return "pending-start"

    return "active"