from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, MetaData, Time, Boolean
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSON


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    metadata = MetaData()


class User_Action_Log(Base):
    """User Action Log model."""

    __tablename__ = "user-action-logs"
    id = Column(Integer, primary_key=True)
    user_name = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_role = Column(String, nullable=True)
    timestamp = Column(DateTime, nullable=True)
    request_session_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    data = Column(String, nullable=True)

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        return {
            "id": self.id,
            "user_name": self.user_name,
            "user_id": self.user_id,
            "user_role": self.user_role,
            "timestamp": self.timestamp,
            "request_session_id": self.request_session_id,
            "action": self.action,
            "data": self.data
        }

class Http_Log(Base):
    """HTTP Log model."""

    __tablename__ = "http-logs"
    id = Column(String, primary_key=True)
    request_id = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=True)
    dest_url = Column(String, nullable=True)
    action = Column(String, nullable=True)
    headers = Column(String, nullable=True)  # Store as JSON string
    data = Column(String, nullable=True)   # Store as JSON string
    response_status_code = Column(Integer, nullable=True)
    response_data = Column(String, nullable=True)  # Store as string
    end_time = Column(DateTime, nullable=True)
    
    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        return {
            "id": self.id,
            "request_id": self.request_id,
            "source_url": self.source_url,
            "start_time": self.start_time,
            "dest_url": self.dest_url,
            "action": self.action,
            "headers": self.headers,
            "data": self.data,
            "response_status_code": self.response_status_code,
            "response_data": self.response_data,
            "end_time": self.end_time
        }

class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)

    # Relationships
    events = relationship("Event", back_populates="organizer")
    reports = relationship("Report", back_populates="user")
    spots = relationship("Spot", back_populates="owner")
    favorite_spots = relationship("SpotFavorite", back_populates="user", cascade="all, delete-orphan")
    event_subscriptions = relationship("EventSubscription", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Spot(Base):
    """Spot model (Permanent location)."""

    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False)
    location = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)  # Indexed with GIST
    address = Column(String, nullable=True)

    # Permanence
    spot_type = Column(String(20), nullable=False, default='permanent')
    permanence_reason = Column(String, nullable=True)

    # Source tracking
    source = Column(String(20), nullable=False, default='user_created')
    osm_id = Column(String(255), nullable=True)
    osm_data = Column(JSON, nullable=True)

    # Ownership and approval
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_approved = Column(Boolean, nullable=False, default=False)

    # Timestamps
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    last_activity = Column(DateTime, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="spots")
    events = relationship("Event", back_populates="spot")
    reports = relationship("Report", back_populates="spot")
    favorited_by = relationship("SpotFavorite", back_populates="spot", cascade="all, delete-orphan")

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        coords = None
        if self.location is not None:
            shape = to_shape(self.location)
            # PostGIS stores as (lng, lat) but return as [lat, lng] for Leaflet
            coords = [shape.y, shape.x]

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": coords,
            "category": self.category,
            "owner_id": self.owner_id,
            "is_approved": self.is_approved,
            "spot_type": self.spot_type,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "permanence_reason": None,
            "source": self.source or "user",
            "osm_id": self.osm_id,
        }


class Event(Base):
    """Event model - Temporary happenings at locations."""

    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    description = Column(String)
    location = Column(Geometry(geometry_type="POINT"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    category = Column(String)
    status = Column(String)  # Event status: 'active', 'archived', 'cancelled'
    owner_id = Column(Integer, ForeignKey("users.id"))
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True)
    
    # Relationships
    organizer = relationship("User", back_populates="events")
    spot = relationship("Spot", back_populates="events")
    reports = relationship("Report", back_populates="event", cascade="all, delete-orphan")
    subscribers = relationship("EventSubscription", back_populates="event", cascade="all, delete-orphan")

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        coords = None
        if self.location is not None:
            shape = to_shape(self.location)
            coords = [shape.y, shape.x]

        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": coords,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "category": self.category,
            "status": self.status,
            "spot_id": self.spot_id,
            "owner_id": self.owner_id if self.owner_id is not None else None,
        }


class Report(Base):
    """Report model."""

    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    picture = Column(String, nullable=True)
    date = Column(DateTime)
    time = Column(Time)
    status = Column(String)
    is_flagged = Column(Boolean, default=False)
    score = Column(Integer, nullable=True)  # Rating/score (1-5 stars, wave level, crowdedness, etc.)
    
    # Relationships
    event = relationship("Event", back_populates="reports")
    spot = relationship("Spot", back_populates="reports")
    user = relationship("User", back_populates="reports")

    def to_api_model(self) -> dict:
        user_name = self.user.name if self.user and self.user.name else (self.user.email if self.user else "Anonymous")
        return {
            "id": self.id,
            "event_id": self.event_id if self.event_id else 0, 
            "spot_id": self.spot_id if self.spot_id else 0,
            "user_id": self.user_id,
            "user_name": user_name,
            "description": self.description,
            "picture": self.picture,
            "date": self.date.isoformat() if self.date else None,
            "time": self.time.isoformat() if self.time else None,
            "status": self.status,
            "is_flagged": self.is_flagged,
            "score": self.score
        }


class SpotFavorite(Base):
    """User's favorite spots."""
    __tablename__ = "spot_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    spot_id = Column(Integer, ForeignKey("spots.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="favorite_spots")
    spot = relationship("Spot", back_populates="favorited_by")


class EventSubscription(Base):
    """User's event subscriptions."""
    __tablename__ = "event_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="event_subscriptions")
    event = relationship("Event", back_populates="subscribers")

class Notification(Base):
    """User notifications."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String, nullable=False)
    related_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="notifications")

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "related_id": self.related_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }