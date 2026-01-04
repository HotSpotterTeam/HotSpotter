from fastapi import APIRouter, status, Depends, HTTPException, Query, Path
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User, Spot, Event, Report
from app.api.auth_utils import get_current_user
from app.api.api_models import UserResponse
from typing import List, Optional, Dict, Any
from app.hs_logging import log_user_action, get_request_session_id

router = APIRouter()

# --- Dependency: Admin Only Check ---
# We use this to protect ALL endpoints in this file.
# It ensures the requester is logged in AND is an admin.
def get_current_admin(current_user: User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have admin privileges"
        )
    return current_user

# --- 1. LIST USERS ---
@router.get("/users", status_code=status.HTTP_200_OK, response_model=List[UserResponse])
async def list_users(
    id: Optional[int] = Query(None),
    name: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    google_id: Optional[str] = Query(None),
    is_admin: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_admin)
):
    """
    Get all users with optional filters.
    """
    with get_session() as session:
        query = session.query(User)

        if search:
            # Build a list of conditions
            conditions = [
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.google_id == search
            ]
            # If search is a number, also check ID
            if search.isdigit():
                conditions.append(User.id == int(search))
            
            # Apply OR logic
            query = query.filter(or_(*conditions))

        # Apply filters if provided
        if id:
            query = query.filter(User.id == id)
        if name:
            query = query.filter(User.name.ilike(f"%{name}%"))
        if email:
            query = query.filter(User.email.ilike(f"%{email}%"))
        if username:
            query = query.filter(User.username.ilike(f"%{username}%"))
        if google_id:
            query = query.filter(User.google_id == google_id)
        if is_admin is not None:
            query = query.filter(User.is_admin == is_admin)

        return query.all()

# --- 2. GET SINGLE USER ---
@router.get("/users/{user_id}", status_code=status.HTTP_200_OK, response_model=UserResponse)
async def get_user(
    user_id: int = Path(...),
    current_user: User = Depends(get_current_admin)
):
    with get_session() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

# --- 3. TOGGLE USER ROLE ---
@router.put("/users/{user_id}/role", status_code=status.HTTP_200_OK)
async def toggle_user_role(
    user_id: int = Path(...),
    current_user: User = Depends(get_current_admin),
    request_session_id=Depends(get_request_session_id)
):
    """
    Toggle a user between 'User' and 'Admin'.
    """
    with get_session() as session:
        user_to_edit = session.query(User).filter(User.id == user_id).first()
        
        if not user_to_edit:
            raise HTTPException(status_code=404, detail="User not found")

        # Safety: Prevent accidental self-demotion
        if user_to_edit.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot demote yourself.")

        # Store old data for logging
        old_data = {"user_id": user_to_edit.id, "email": user_to_edit.email, "is_admin": user_to_edit.is_admin}
        
        user_to_edit.is_admin = not user_to_edit.is_admin
        session.commit()
        session.refresh(user_to_edit)
        
        new_data = {"user_id": user_to_edit.id, "email": user_to_edit.email, "is_admin": user_to_edit.is_admin}
        log_user_action("toggle_user_role", current_user, new_data=new_data, request_session_id=request_session_id, old_data=old_data)
        
        role = "Admin" if user_to_edit.is_admin else "User"
        return {"status": "success", "message": f"User {user_to_edit.email} is now {role}"}

# --- 4. DELETE USER ---
@router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: int = Path(...),
    current_user: User = Depends(get_current_admin),
    request_session_id=Depends(get_request_session_id)
):
    """
    Permanently delete a user.
    """
    with get_session() as session:
        user_to_delete = session.query(User).filter(User.id == user_id).first()
        
        if not user_to_delete:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Safety: Prevent accidental self-deletion
        if user_to_delete.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

        # Store deleted data for logging
        deleted_data = {"user_id": user_to_delete.id, "email": user_to_delete.email, "name": user_to_delete.name, "is_admin": user_to_delete.is_admin}
        
        session.delete(user_to_delete)
        session.commit()
        
        log_user_action("delete_user", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": f"User {user_to_delete.email} deleted"}

# --- 5. GET GLOBAL STATS ---
@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_stats(
    current_user: User = Depends(get_current_admin)
):
    """
    Returns dashboard statistics:
    - Counts for Users, Admins
    - Counts for Spots (Approved vs Pending)
    - Counts for Events (Active vs Pending)
    - Counts for Reports (Total vs Flagged)
    - Breakdown of categories
    """
    with get_session() as session:
        # 1. User Stats
        total_users = session.query(User).count()
        total_admins = session.query(User).filter(User.is_admin == True).count()

        # 2. Spot Stats
        total_spots = session.query(Spot).count()
        approved_spots = session.query(Spot).filter(Spot.is_approved == True).count()
        pending_spots = session.query(Spot).filter(Spot.is_approved == False).count()
        
        # Spot Categories breakdown
        spot_categories_data = session.query(Spot.category, func.count(Spot.id)).group_by(Spot.category).all()
        spot_categories = {cat: count for cat, count in spot_categories_data if cat}

        # 3. Event Stats
        total_events = session.query(Event).count()
        active_events = session.query(Event).filter(Event.status == 'active').count()
        pending_events = session.query(Event).filter(Event.status == 'pending').count()

        # Event Categories breakdown
        event_categories_data = session.query(Event.category, func.count(Event.id)).group_by(Event.category).all()
        event_categories = {cat: count for cat, count in event_categories_data if cat}

        # 4. Report Stats
        total_reports = session.query(Report).count()
        flagged_reports = session.query(Report).filter(Report.is_flagged == True).count()
        reports_on_spots = session.query(Report).filter(Report.spot_id.isnot(None)).count()
        reports_on_events = session.query(Report).filter(Report.event_id.isnot(None)).count()

        return {
            "status": "success",
            "data": {
                "users": {
                    "total": total_users,
                    "admins": total_admins,
                    "regular": total_users - total_admins
                },
                "spots": {
                    "total": total_spots,
                    "approved": approved_spots,
                    "pending": pending_spots,
                    "by_category": spot_categories
                },
                "events": {
                    "total": total_events,
                    "active": active_events,
                    "pending": pending_events,
                    "by_category": event_categories
                },
                "reports": {
                    "total": total_reports,
                    "flagged": flagged_reports,
                    "on_spots": reports_on_spots,
                    "on_events": reports_on_events
                }
            }
        }