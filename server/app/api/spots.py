from fastapi import APIRouter, status, Query, Path, Depends, HTTPException
from sqlalchemy import func, desc, or_, select
from app.db import get_session
from app.models import Spot, User, Report
from app.api.api_models import CreateSpot, SpotResponse, SpotsResponse, UpdateSpot
from app.api.auth_utils import get_current_user
from geoalchemy2 import WKTElement
from typing import List
from app.hs_logging import log_user_action, get_request_session_id

router = APIRouter()


# --- 1. LIST SPOTS (Map View & Filters) ---
@router.get("/", status_code=status.HTTP_200_OK, response_model=SpotsResponse)
async def list_spots(
        search: str | None = Query(None, description="Search text in spot name"),
        category: str | None = Query(None),
        is_approved: bool | None = Query(None,
                                         description="Filter by approval status (default: None for all, True for approved only, False for non-approved only)"),
        owner_id: int | None = Query(None, description="Filter by spot creator"),
        sort_by: str | None = Query("creation", description="Options: 'creation', 'reports'"),
        # Radius Filter
        lat: float | None = Query(None),
        lng: float | None = Query(None),
        radius: float = Query(5000, description="Radius in meters"),
        # Bounding Box Filter (Map View)
        min_lat: float | None = Query(None),
        max_lat: float | None = Query(None),
        min_lng: float | None = Query(None),
        max_lng: float | None = Query(None),
        page: int = Query(1, ge=1),
        limit: int = Query(50, ge=1, le=100)
):
    """
    Get all spots.
    - Default: Returns only APPROVED spots.
    - Admin/Owner can query ?is_approved=false to see pending spots.
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
                conditions.append(Spot.owner_id == int(search))  # Search by Owner ID

            query = query.filter(or_(*conditions))

        # 1. Standard Filters
        if is_approved is not None:
            query = query.filter(Spot.is_approved == is_approved)

        if category:
            query = query.filter(Spot.category == category)
        # Note: search filter is already applied above with OR logic (lines 38-48)
        if owner_id:
            query = query.filter(Spot.owner_id == owner_id)

        # 2. Location Filters (Bbox has priority over Radius)
        if min_lat and max_lat and min_lng and max_lng:
            # Create a box from the map view coordinates
            bbox = func.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
            query = query.filter(func.ST_Within(Spot.location, bbox))

        elif lat is not None and lng is not None:
            # Radius search
            user_point = WKTElement(f'POINT({lng} {lat})', srid=4326)
            query = query.filter(func.ST_DWithin(Spot.location, user_point, radius))

        # 3. Sorting
        if sort_by == "reports":
            stmt = (
                select(func.count(Report.id))
                .where(Report.spot_id == Spot.id)
                .correlate(Spot)
                .scalar_subquery()
            )
            query = query.order_by(stmt.desc())
        else:
            # Default: Newest first
            query = query.order_by(Spot.id.desc())
        # 4. Pagination
        total_count = query.count()
        offset = (page - 1) * limit
        spots = query.offset(offset).limit(limit).all()
        # Return list matching SpotsResponse model
        return {
            "spots": [spot.to_api_model() for spot in spots],
            "total": total_count
        }


# --- 2. GET SINGLE SPOT ---
@router.get("/{id}", status_code=status.HTTP_200_OK, response_model=SpotResponse)
async def get_spot(id: int = Path(...)):
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")
        return spot.to_api_model()


# --- 3. CREATE SPOT ---
@router.post("/", status_code=status.HTTP_201_CREATED, response_model=SpotResponse)
async def create_spot(
        spot_data: CreateSpot,
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    with get_session() as session:
        # Validate spot_type
        if spot_data.spot_type not in ['permanent', 'temporary']:
            raise HTTPException(400, "spot_type must be 'permanent' or 'temporary'")

        # Temporary spots must have expires_at
        if spot_data.spot_type == 'temporary' and not spot_data.expires_at:
            raise HTTPException(400, "Temporary spots must have expires_at date")

        # Permanent spots should not have expires_at
        if spot_data.spot_type == 'permanent' and spot_data.expires_at:
            raise HTTPException(400, "Permanent spots cannot have expires_at date")

        new_spot = Spot(
            name=spot_data.name,
            description=spot_data.description,
            category=spot_data.category,
            location=WKTElement(f"POINT({spot_data.location[1]} {spot_data.location[0]})", srid=4326),
            address=spot_data.address,
            spot_type=spot_data.spot_type,
            permanence_reason=spot_data.permanence_reason,
            expires_at=spot_data.expires_at,
            owner_id=current_user.id,
            source='user',
            is_approved=False
        )

        session.add(new_spot)
        session.commit()
        session.refresh(new_spot)
        log_user_action("create_spot", current_user, new_data=new_spot.to_api_model(), request_session_id=request_session_id)

        return SpotResponse(
            id=new_spot.id,
            name=new_spot.name,
            description=new_spot.description,
            category=new_spot.category,
            location=[
                session.scalar(func.ST_Y(new_spot.location)),
                session.scalar(func.ST_X(new_spot.location))
            ],
            address=new_spot.address,
            spot_type=new_spot.spot_type,
            permanence_reason=new_spot.permanence_reason,
            source=new_spot.source,
            osm_id=new_spot.osm_id,
            owner_id=new_spot.owner_id,
            is_approved=new_spot.is_approved,
            expires_at=new_spot.expires_at,
            created_at=new_spot.created_at,
            updated_at=new_spot.updated_at,
            last_activity=new_spot.last_activity
        )


# --- 4. UPDATE SPOT (Owner/Admin) ---
# In server/app/api/spots.py

@router.put("/{id}", status_code=status.HTTP_200_OK, response_model=SpotResponse)
async def update_spot(
        spot_update: UpdateSpot,
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        # Security: Owner OR Admin
        if spot.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to update this spot")

        # Store old data for logging
        old_data = spot.to_api_model()
        
        # 1. Extract update data
        update_data = spot_update.model_dump(exclude_unset=True)

        # 2. Handle Location update with SRID FIX
        if "location" in update_data:
            coords = update_data.pop("location")
            # PostGIS requires POINT(lng lat) and we MUST specify srid=4326
            spot.location = WKTElement(f"POINT({coords[0]} {coords[1]})", srid=4326)

        # 3. Update remaining text fields automatically
        for key, value in update_data.items():
            setattr(spot, key, value)

        # 4. If the user is NOT an admin, any edit resets approval to False.
        if not getattr(current_user, "is_admin", False):
            spot.is_approved = False

        session.commit()
        session.refresh(spot)
        log_user_action("update_spot", current_user, new_data=spot.to_api_model(), request_session_id=request_session_id, old_data=old_data)
        return spot.to_api_model()


# --- 5. DELETE SPOT (Owner/Admin) ---
@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_spot(
        id: int = Path(...),
        current_user: User = Depends(get_current_user),
        request_session_id=Depends(get_request_session_id)
):
    with get_session() as session:
        spot = session.query(Spot).filter(Spot.id == id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")

        if spot.owner_id != current_user.id and not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Not authorized to delete this spot")

        # Store deleted data for logging
        deleted_data = spot.to_api_model()
        
        session.delete(spot)
        session.commit()
        log_user_action("delete_spot", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": "Spot deleted"}


# --- 6. APPROVE SPOT (Admin Only) ---
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
        if not getattr(current_user, "is_admin", False):
            raise HTTPException(status_code=403, detail="Only admins can approve new spots")

        if spot.is_approved:
            return {"status": "success", "message": "Spot is already approved"}

        spot.is_approved = True
        session.commit()
        session.refresh(spot)

        log_user_action("approve_spot", current_user, new_data=spot.to_api_model(),
                        request_session_id=request_session_id)

        # Send notification to spot owner
        from app.notification_utils import notify_spot_approved
        notify_spot_approved(spot.id, spot.name, spot.owner_id)

        return {"status": "success", "message": "Spot approved and public"}