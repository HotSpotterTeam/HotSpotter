from fastapi import APIRouter, status, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from app.db import get_session
from app.models import User, Spot, Event, SpotFavorite, EventSubscription
from app.api.auth_utils import get_current_user
from typing import List
from app.hs_logging import log_user_action, get_request_session_id

router = APIRouter()

# SPOT FAVORITES

@router.get("/favorites/spots", status_code=status.HTTP_200_OK)
async def get_favorite_spots(current_user: User = Depends(get_current_user)):
    """Get all favorite spots for the current user"""
    with get_session() as session:
        favorites = session.query(SpotFavorite).filter(
            SpotFavorite.user_id == current_user.id
        ).all()
        
        spots = []
        for fav in favorites:
            spot = session.query(Spot).filter(Spot.id == fav.spot_id).first()
            if spot:
                spots.append(spot.to_api_model())
        
        return {"status": "success", "data": spots}


@router.post("/spots/{spot_id}/favorite", status_code=status.HTTP_201_CREATED)
async def favorite_spot(
    spot_id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Add a spot to favorites"""
    with get_session() as session:
        # Check if spot exists
        spot = session.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=404, detail="Spot not found")
        
        # Check if already favorited
        existing = session.query(SpotFavorite).filter(
            SpotFavorite.user_id == current_user.id,
            SpotFavorite.spot_id == spot_id
        ).first()
        
        if existing:
            return {"status": "success", "message": "Spot already in favorites"}
        
        # Create favorite
        favorite = SpotFavorite(
            user_id=current_user.id,
            spot_id=spot_id
        )
        session.add(favorite)
        session.commit()
        session.refresh(favorite)
        
        log_user_action("favorite_spot", current_user, new_data={"spot_id": spot_id, "user_id": current_user.id}, request_session_id=request_session_id)
        return {"status": "success", "message": "Spot added to favorites"}


@router.delete("/spots/{spot_id}/favorite", status_code=status.HTTP_200_OK)
async def unfavorite_spot(
    spot_id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Remove a spot from favorites"""
    with get_session() as session:
        favorite = session.query(SpotFavorite).filter(
            SpotFavorite.user_id == current_user.id,
            SpotFavorite.spot_id == spot_id
        ).first()
        
        if not favorite:
            raise HTTPException(status_code=404, detail="Favorite not found")
        
        # Store deleted data for logging
        deleted_data = {"spot_id": spot_id, "user_id": current_user.id}
        
        session.delete(favorite)
        session.commit()
        
        log_user_action("unfavorite_spot", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": "Spot removed from favorites"}


# EVENT SUBSCRIPTIONS

@router.get("/subscriptions/events", status_code=status.HTTP_200_OK)
async def get_subscribed_events(current_user: User = Depends(get_current_user)):
    """Get all subscribed events for the current user"""
    with get_session() as session:
        subscriptions = session.query(EventSubscription).filter(
            EventSubscription.user_id == current_user.id
        ).all()
        
        events = []
        for sub in subscriptions:
            event = session.query(Event).filter(Event.id == sub.event_id).first()
            if event:
                events.append(event.to_api_model())
        
        return {"status": "success", "data": events}


@router.post("/events/{event_id}/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_event(
    event_id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Subscribe to an event"""
    with get_session() as session:
        # Check if event exists
        event = session.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Check if already subscribed
        existing = session.query(EventSubscription).filter(
            EventSubscription.user_id == current_user.id,
            EventSubscription.event_id == event_id
        ).first()
        
        if existing:
            return {"status": "success", "message": "Already subscribed to event"}
        
        # Create subscription
        subscription = EventSubscription(
            user_id=current_user.id,
            event_id=event_id
        )
        session.add(subscription)
        session.commit()
        session.refresh(subscription)
        
        log_user_action("subscribe_to_event", current_user, new_data={"event_id": event_id, "user_id": current_user.id}, request_session_id=request_session_id)
        return {"status": "success", "message": "Subscribed to event"}


@router.delete("/events/{event_id}/subscribe", status_code=status.HTTP_200_OK)
async def unsubscribe_from_event(
    event_id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Unsubscribe from an event"""
    with get_session() as session:
        subscription = session.query(EventSubscription).filter(
            EventSubscription.user_id == current_user.id,
            EventSubscription.event_id == event_id
        ).first()
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Store deleted data for logging
        deleted_data = {"event_id": event_id, "user_id": current_user.id}
        
        session.delete(subscription)
        session.commit()
        
        log_user_action("unsubscribe_from_event", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": "Unsubscribed from event"}
