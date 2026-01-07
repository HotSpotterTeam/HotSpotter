from fastapi import APIRouter, status, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db import get_session
from app.models import User, Notification
from app.api.auth_utils import get_current_user
from typing import List, Optional
from datetime import datetime

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def get_notifications(
        unread_only: bool = Query(False, description="Filter for unread notifications only"),
        current_user: User = Depends(get_current_user)
):
    """
    Get all notifications for the current user.
    Returns notifications sorted by newest first.
    """
    with get_session() as session:
        query = session.query(Notification).filter(
            Notification.user_id == current_user.id
        )

        if unread_only:
            query = query.filter(Notification.is_read == False)

        notifications = query.order_by(desc(Notification.created_at)).all()

        return {
            "status": "success",
            "data": [notif.to_api_model() for notif in notifications]
        }


@router.get("/unread-count", status_code=status.HTTP_200_OK)
async def get_unread_count(
        current_user: User = Depends(get_current_user)
):
    """
    Get count of unread notifications for the current user.
    """
    with get_session() as session:
        count = session.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).count()

        return {
            "status": "success",
            "count": count
        }


@router.put("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(
        notification_id: int,
        current_user: User = Depends(get_current_user)
):
    """
    Mark a notification as read.
    """
    with get_session() as session:
        notification = session.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        ).first()

        if not notification:
            return {"status": "error", "message": "Notification not found"}, 404

        notification.is_read = True
        session.commit()

        return {
            "status": "success",
            "message": "Notification marked as read"
        }


@router.put("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_as_read(
        current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications as read for the current user.
    """
    with get_session() as session:
        session.query(Notification).filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        ).update({"is_read": True})

        session.commit()

        return {
            "status": "success",
            "message": "All notifications marked as read"
        }


@router.delete("/{notification_id}", status_code=status.HTTP_200_OK)
async def delete_notification(
        notification_id: int,
        current_user: User = Depends(get_current_user)
):
    """
    Delete a notification.
    """
    with get_session() as session:
        notification = session.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id
        ).first()

        if not notification:
            return {"status": "error", "message": "Notification not found"}, 404

        session.delete(notification)
        session.commit()

        return {
            "status": "success",
            "message": "Notification deleted"
        }