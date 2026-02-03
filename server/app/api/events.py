from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_, select
from sqlalchemy.orm import joinedload
from app.db import get_session
from app.models import Event, User, Spot, Report
from app.api.api_models import CreateEvent, EventsResponse, EventResponse, UpdateEvent
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from datetime import date, datetime, time as dt_time, timedelta, timezone
import pytz
import time
from app.notification_utils import notify_event_approved, notify_event_created_at_spot
from app.trending import calculate_trending_score, calculate_trending_scores_batch
from app.profiling import TimingContext
from app.hs_logging import log_user_action, get_request_session_id
import logging

LOCAL_TZ = pytz.timezone("Asia/Jerusalem")
logger = logging.getLogger(__name__)

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
    limit: int = Query(50, ge=1, le=1000),
):
    """
    Get all events.
    - Default status is 'active' (hides pending).
    - Managers/Creators can fetch 'pending' by passing ?status=pending
    - Now includes trending_score for each event!
    """
    start_time = time.time()
    with get_session() as session:
        # Build optimized query that extracts lat/lng directly in SQL
        # and joins spot/organizer for their names
        query = session.query(
            Event.id,
            Event.name,
            Event.description,
            Event.start_time,
            Event.end_time,
            Event.category,
            Event.external_link,
            Event.status,
            Event.spot_id,
            Event.owner_id,
            func.ST_Y(Event.location).label('lat'),  # Extract lat directly in SQL
            func.ST_X(Event.location).label('lng'),  # Extract lng directly in SQL
            Spot.name.label('spot_name'),
            User.name.label('user_name'),
        ).outerjoin(Spot, Event.spot_id == Spot.id).outerjoin(User, Event.owner_id == User.id)

        # Build filter conditions
        filters = []

        if search:
            search_conditions = [
                Event.name.ilike(f"%{search}%"),
                Event.description.ilike(f"%{search}%"),
                Event.status.ilike(f"%{search}%"),
            ]
            if search.isdigit():
                search_conditions.append(Event.id == int(search))
                search_conditions.append(Event.owner_id == int(search))
                search_conditions.append(Event.spot_id == int(search))
            filters.append(or_(*search_conditions))

        # Filter out completed events by default
        if status and status != "all":
            filters.append(Event.status == status)
        else:
            # If status is "all", exclude completed events unless explicitly searching for them
            filters.append(Event.status != "completed")

        if category:
            filters.append(Event.category == category)

        if owner_id:
            filters.append(Event.owner_id == owner_id)

        if spot_id:
            filters.append(Event.spot_id == spot_id)

        if min_lat and max_lat and min_lng and max_lng:
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            filters.append(func.ST_Within(Event.location, bbox))
        elif lat is not None and lng is not None:
            user_point = WKTElement(f"POINT({lng} {lat})", srid=4326)
            filters.append(func.ST_DWithin(Event.location, user_point, radius))

        # Apply all filters
        if filters:
            query = query.filter(*filters)

        # Optimized count: use a simpler count query without ORDER BY and JOINs
        with TimingContext("count_query"):
            count_query = session.query(func.count(Event.id))
            if filters:
                count_query = count_query.filter(*filters)
            total_count = count_query.scalar()

        # Apply sorting
        if sort_by == "reports":
            # For report sorting, we need a subquery
            report_count = select(func.count(Report.id)).where(Report.event_id == Event.id).correlate(Event).scalar_subquery()
            query = query.order_by(report_count.desc())
        else:
            query = query.order_by(Event.id.desc())

        offset = (page - 1) * limit
        with TimingContext("fetch_events"):
            rows = query.offset(offset).limit(limit).all()

        # Batch calculate trending scores for all events at once
        event_ids = [row.id for row in rows]
        with TimingContext("trending_scores"):
            trending_scores = calculate_trending_scores_batch(event_ids=event_ids, session=session) if event_ids else {}

        with TimingContext("serialize_events"):
            events_with_trending = []
            for row in rows:
                # Build dict directly from query results - no to_shape() needed!
                event_dict = {
                    "id": row.id,
                    "name": row.name,
                    "description": row.description,
                    "location": [row.lat, row.lng] if row.lat and row.lng else None,
                    "start_time": row.start_time.isoformat() if row.start_time else None,
                    "end_time": row.end_time.isoformat() if row.end_time else None,
                    "category": row.category,
                    "external_link": row.external_link,
                    "status": row.status,
                    "spot_id": row.spot_id,
                    "spot_name": row.spot_name,
                    "owner_id": row.owner_id,
                    "user_name": row.user_name,
                    "trending_score": trending_scores.get(row.id, 0),
                }
                events_with_trending.append(event_dict)

        total_time = time.time() - start_time
        if total_time > 0.5:
            logger.warning(f"[PERF] list_events took {total_time:.3f}s for {len(events_with_trending)} events")

        return {"status": "success", "data": events_with_trending, "total": total_count}


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
        event_dict["trending_score"] = calculate_trending_score(event_id=event.id, session=session)

        return event_dict


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: CreateEvent,
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id),
):
    """
    Create a new event.
    """
    with get_session() as session:
        if event_data.spot_id:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if not spot:
                raise HTTPException(status_code=404, detail="Spot not found")

            # Auto-approve if:
            # 1. User owns the spot, OR
            # 2. Spot is public (beach or park), OR
            # 3. User is admin
            if spot.owner_id == current_user.id or spot.category in ["beach", "park"] or current_user.is_admin:
                status_str = "pending-start"
            else:
                status_str = "pending"

            location_from_spot = spot.location
            location_wkt = location_from_spot
        else:
            status_str = "pending-start"
            if event_data.custom_location and len(event_data.custom_location) == 2:
                lat, lng = event_data.custom_location
                location_wkt = WKTElement(f"POINT({lng} {lat})", srid=4326)
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
            status=status_str,
        )
        session.add(new_event)
        session.commit()
        session.refresh(new_event)

        if event_data.spot_id:
            spot = session.query(Spot).filter(Spot.id == event_data.spot_id).first()
            if spot:
                notify_event_created_at_spot(new_event.id, new_event.name, spot.name, spot.owner_id)

        log_user_action(
            action="create_event",
            user=current_user,
            new_data={"name": event_data.name, "category": event_data.category, "event_id": new_event.id},
            request_session_id=request_session_id,
        )

        event_dict = new_event.to_api_model()
        event_dict["trending_score"] = calculate_trending_score(event_id=new_event.id, session=session)

        return event_dict


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_event(
    id: int,
    event_update: UpdateEvent,
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id),
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
            request_session_id=request_session_id,
        )

        event_dict = event.to_api_model()
        event_dict["trending_score"] = calculate_trending_score(event_id=event.id, session=session)

        return event_dict


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_event(
    id: int, current_user: User = Depends(get_current_user), request_session_id=Depends(get_request_session_id)
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
            action="delete_event", user=current_user, new_data={"event_id": id}, request_session_id=request_session_id
        )

        return {"status": "success", "message": "Event deleted"}


@router.put("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_event(
    id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id),
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
        if spot.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only the spot owner can approve this event")

        if event.status == "pending-start" or event.status == "active":
            return {"status": "success", "message": "Event is already approved"}

        event.status = "pending-start"
        session.commit()

        notify_event_approved(event.id, event.name, event.owner_id)

        log_user_action(
            "approve_event", current_user, new_data=event.to_api_model(), request_session_id=request_session_id
        )
        return {"status": "success", "message": "Event approved and will start at scheduled time"}
