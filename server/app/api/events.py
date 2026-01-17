from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_
from app.db import get_session
from app.models import Event, User, Spot, Report
from app.api.api_models import CreateEvent, EventsResponse, EventResponse, UpdateEvent
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from datetime import date, datetime, time, timedelta, timezone
import pytz
from app.notification_utils import notify_event_approved, notify_event_created_at_spot
from app.trending import calculate_trending_score

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
        limit: int = Query(50, ge=1, le=1000)
):
    """
    Get all events.
    - Default status is 'active' (hides pending).
    - Managers/Creators can fetch 'pending' by passing ?status=pending
    - Now includes trending_score for each event!
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
                conditions.append(Event.owner_id == int(search))
                conditions.append(Event.spot_id == int(search))

            query = query.filter(or_(*conditions))

        # Filter out completed events by default
        if status and status != "all":
            query = query.filter(Event.status == status)
        else:
            # If status is "all", exclude completed events unless explicitly searching for them
            query = query.filter(Event.status != 'completed')
        if category:
            query = query.filter(Event.category == category)

        if owner_id:
            query = query.filter(Event.owner_id == owner_id)
        if spot_id:
            query = query.filter(Event.spot_id == spot_id)

        if lat is not None and lng is not None:
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Event.location, user_point, radius))

        if min_lat and max_lat and min_lng and max_lng:
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            query = query.filter(func.ST_Within(Event.location, bbox))

        elif lat is not None and lng is not None:
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Event.location, user_point, radius))

        if sort_by == "reports":
            query = query.outerjoin(Report).group_by(Event.id).order_by(func.count(Report.id).desc())
        else:
            query = query.order_by(Event.id.desc())

        total_count = query.count()
        offset = (page - 1) * limit
        events = query.offset(offset).limit(limit).all()

        events_with_trending = []
        for event in events:
            event_dict = event.to_api_model()
            event_dict['trending_score'] = calculate_trending_score(
                event_id=event.id,
                session=session
            )
            events_with_trending.append(event_dict)

        return {
            "status": "success",
            "data": events_with_trending,
            "total": total_count
        }


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_event(id: int = Path(..., ge=1)):
    """
    Get a single event by ID.
    - Now includes trending_score!
    """
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        event_dict = event.to_api_model()
        event_dict['trending_score'] = calculate_trending_score(
            event_id=event.id,
            session=session
        )

        return event_dict


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(
        event_data: CreateEvent,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Create a new event.
    """
    with get_session() as session:
        if event_data.spot_id:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if not spot:
                raise HTTPException(status_code=404, detail="Spot not found")

            if spot.owner_id != current_user.id and not current_user.is_admin:
                status_str = "pending"
            else:
                status_str = "pending-start"

            location_from_spot = spot.location
            location_wkt = location_from_spot
        else:
            status_str = "pending-start"
            if event_data.custom_location and len(event_data.custom_location) == 2:
                lat, lng = event_data.custom_location
                location_wkt = WKTElement(f'POINT({lng} {lat})', srid=4326)
            else:
                raise HTTPException(status_code=400, detail="Custom location required when spot_id is not provided")

        start_dt = datetime.fromisoformat(event_data.start_time)
        end_dt = datetime.fromisoformat(event_data.end_time)

        new_event = Event(
            name=event_data.name,
            description=event_data.description,
            location=location_wkt,
            category=event_data.category,
            start_time=start_dt,
            end_time=end_dt,
            external_link=event_data.external_link,
            owner_id=current_user.id,
            spot_id=event_data.spot_id,
            status=status_str
        )
        session.add(new_event)
        session.commit()
        session.refresh(new_event)

        if event_data.spot_id:
            notify_event_created_at_spot(event_data.spot_id, new_event.id, new_event.name, session)

        log_user_action(
            action="create_event",
            user=current_user,
            new_data={"name": event_data.name, "category": event_data.category, "event_id": new_event.id},
            request_session_id=request_session_id
        )

        event_dict = new_event.to_api_model()
        event_dict['trending_score'] = calculate_trending_score(
            event_id=new_event.id,
            session=session
        )

        return event_dict


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_event(
        id: int,
        event_update: UpdateEvent,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Update an existing event.
    """
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to edit this event")

        if event_update.name is not None:
            event.name = event_update.name
        if event_update.description is not None:
            event.description = event_update.description
        if event_update.category is not None:
            event.category = event_update.category
        if event_update.external_link is not None:
            event.external_link = event_update.external_link
        if event_update.start_time:
            event.start_time = datetime.fromisoformat(event_update.start_time)
        if event_update.end_time:
            event.end_time = datetime.fromisoformat(event_update.end_time)

        session.commit()
        session.refresh(event)

        log_user_action(
            action="update_event",
            user=current_user,
            new_data={"event_id": event.id, "updated_fields": event_update.dict(exclude_unset=True)},
            request_session_id=request_session_id
        )

        event_dict = event.to_api_model()
        event_dict['trending_score'] = calculate_trending_score(
            event_id=event.id,
            session=session
        )

        return event_dict


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_event(
        id: int,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Delete an event.
    """
    with get_session() as session:
        event = session.query(Event).filter(Event.id == id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if event.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this event")

        session.delete(event)
        session.commit()

        log_user_action(
            action="delete_event",
            user=current_user,
            new_data={"event_id": id},
            request_session_id=request_session_id
        )

        return {"status": "success", "message": "Event deleted"}