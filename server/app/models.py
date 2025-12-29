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

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        coords = None
        if self.location is not None:
            shape = to_shape(self.location)
            coords = [shape.x, shape.y]

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
            "owner_id": self.owner_id,
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
    
    # Relationships
    event = relationship("Event", back_populates="reports")
    spot = relationship("Spot", back_populates="reports")
    user = relationship("User", back_populates="reports")

    def to_api_model(self) -> dict:
        return {
            "id": self.id,
            "event_id": self.event_id if self.event_id else 0, 
            "spot_id": self.spot_id if self.spot_id else 0,
            "user_id": self.user_id,
            "description": self.description,
            "picture": self.picture,
            "date": self.date.isoformat() if self.date else None,
            "time": self.time.isoformat() if self.time else None,
            "status": self.status,
            "is_flagged": self.is_flagged
        }