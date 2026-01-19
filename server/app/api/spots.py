from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_, select
from app.db import get_session
from app.models import Spot, User, Report
from app.api.api_models import CreateSpot, SpotResponse, SpotsResponse, UpdateSpot
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from typing import List
from app.hs_logging import log_user_action, get_request_session_id
from app.trending import calculate_trending_score
from app.notification_utils import notify_spot_approved

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_spots(
        search: str | None = Query(None, description="Search text in spot name"),
        category: str | None = Query(None),
        is_approved: bool | None = Query(None,
                                         description="Filter by approval status (default: None for all, True for approved only, False for non-approved only)"),
        owner_id: int | None = Query(None, description="Filter by spot creator"),
        sort_by: str | None = Query("creation", description="Options: 'creation', 'reports'"),
        lat: float | None = Query(None),
        lng: float | None = Query(None),
        radius: float = Query(5000, description="Radius in meters"),
        min_lat: float | None = Query(None),
        max_lat: float | None = Query(None),
        min_lng: float | None = Query(None),
        max_lng: float | None = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=1000)
):
    """
    Get all spots.
    - Default: Returns only APPROVED spots.
    - Admin/Owner can query ?is_approved=false to see pending spots.
    - Now includes trending_score for each spot!
    """
    with get_session() as session:
        query = session.query(Spot)

        if search:
            conditions = [
                Spot.name.ilike(f"%{search}%"),
                Spot.category.ilike(f"%{search}%"),
                Spot.description.ilike(f"%{search}%"),
            ]
            if search.isdigit():
                conditions.append(Spot.id == int(search))
                conditions.append(Spot.owner_id == int(search))

            query = query.filter(or_(*conditions))

        if is_approved is not None:
            query = query.filter(Spot.is_approved == is_approved)

        if category:
            query = query.filter(Spot.category == category)

        if owner_id:
            query = query.filter(Spot.owner_id == owner_id)

        if min_lat and max_lat and min_lng and max_lng:
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            query = query.filter(func.ST_Within(Spot.location, bbox))

        elif lat is not None and lng is not None:
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Spot.location, user_point, radius))

        if sort_by == "reports":
            stmt = (
                select(func.count(Report.id))
                .where(Report.spot_id == Spot.id)
                .correlate(Spot)
                .scalar_subquery()
            )
            query = query.order_by(stmt.desc())
        else:
            query = query.order_by(Spot.id.desc())

        total_count = query.count()
        offset = (page - 1) * limit
        spots = query.offset(offset).limit(limit).all()

        spots_with_trending = []
        for spot in spots:
            spot_dict = spot.to_api_model()
            spot_dict['trending_score'] = calculate_trending_score(
                spot_id=spot.id,
                session=session
            )
            spots_with_trending.append(spot_dict)

        return {
            "spots": spots_with_trending,
            "total": total_count
        }


@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_spot(id: int = Path(..., ge=1)):
    """
    Get a single spot by ID.
    - Now includes trending_score!
    """
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        spot_dict = spot.to_api_model()
        spot_dict['trending_score'] = calculate_trending_score(
            spot_id=spot.id,
            session=session
        )

        return spot_dict


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_spot(
        spot_data: CreateSpot,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Create a new spot.
    """
    with get_session() as session:
        if not spot_data.location or len(spot_data.location) != 2:
            raise HTTPException(status_code=400, detail="Location must be [lat, lng]")

        lat, lng = spot_data.location
        location_wkt = WKTElement(f'POINT({lng} {lat})', srid=4326)
        new_spot = Spot(
            name=spot_data.name,
            description=spot_data.description,
            location=location_wkt,
            category=spot_data.category,
            external_link=spot_data.external_link,
            owner_id=current_user.id,
            is_approved=False
        )
        session.add(new_spot)
        session.commit()
        session.refresh(new_spot)

        log_user_action(
            action="create_spot",
            user=current_user,
            new_data={"name": spot_data.name, "category": spot_data.category, "spot_id": new_spot.id},
            request_session_id=request_session_id
        )

        spot_dict = new_spot.to_api_model()
        spot_dict['trending_score'] = calculate_trending_score(
            spot_id=new_spot.id,
            session=session
        )

        return spot_dict


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_spot(
        id: int,
        spot_update: UpdateSpot,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Update an existing spot.
    """
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        if spot.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to edit this spot")

        if spot_update.name is not None:
            spot.name = spot_update.name
        if spot_update.description is not None:
            spot.description = spot_update.description
        if spot_update.category is not None:
            spot.category = spot_update.category
        if spot_update.external_link is not None:
            spot.external_link = spot_update.external_link
        if spot_update.location is not None and len(spot_update.location) == 2:
            lat, lng = spot_update.location
            spot.location = WKTElement(f'POINT({lng} {lat})', srid=4326)

        session.commit()
        session.refresh(spot)

        log_user_action(
            action="update_spot",
            user=current_user,
            new_data={"spot_id": spot.id, "updated_fields": spot_update.dict(exclude_unset=True)},
            request_session_id=request_session_id
        )

        spot_dict = spot.to_api_model()
        spot_dict['trending_score'] = calculate_trending_score(
            spot_id=spot.id,
            session=session
        )

        return spot_dict


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_spot(
        id: int,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Delete a spot.
    """
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        if spot.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this spot")

        session.delete(spot)
        session.commit()

        log_user_action(
            action="delete_spot",
            user=current_user,
            new_data={"spot_id": id},
            request_session_id=request_session_id
        )

        return {"status": "success", "message": "Spot deleted"}


@router.put("/{id}/approve", status_code=status.HTTP_200_OK)
async def approve_spot(
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    """
    Approve a newly created spot.
    SECURITY: Only ADMINS can do this.
    """
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        # Strict Admin Check
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Only admins can approve new spots")

        if spot.is_approved:
            return {"status": "success", "message": "Spot is already approved"}

        spot.is_approved = True
        session.commit()
        session.refresh(spot)
        
        notify_spot_approved(spot.id, spot.name, spot.owner_id)
        
        log_user_action("approve_spot", current_user, new_data=spot.to_api_model(), request_session_id=request_session_id)
        return {"status": "success", "message": "Spot approved and public"}