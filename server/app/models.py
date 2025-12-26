from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, MetaData, Time, Boolean
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    metadata = MetaData()

class Http_Log(Base):
    """HTTP Log model."""

    __tablename__ = "http-logs"
    id = Column(String, primary_key=True)
    request_id = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    dest_url = Column(String, nullable=True)
    action = Column(String, nullable=True)
    headers = Column(String, nullable=True)  # Store as JSON string
    params = Column(String, nullable=True)   # Store as JSON string

    def to_api_model(self) -> dict:
        """Serialize the ORM model into a JSON-friendly dict."""
        return {
            "id": self.id,
            "request_id": self.request_id,
            "source_url": self.source_url,
            "dest_url": self.dest_url,
            "action": self.action,
            "headers": self.headers,
            "params": self.params,
        }

class User(Base):
    """User model."""

    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=True)
    email = Column(String, unique=True)
    password = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)


class Spot(Base):
    """Spot model (Permanent location)."""

    __tablename__ = "spots"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    description = Column(String)
    location = Column(Geometry(geometry_type="POINT"))
    category = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    is_approved = Column(Boolean, default=False)  # Admin needs to approve
    events = relationship("Event", backref="spot", cascade="all, delete-orphan")
    reports = relationship("Report", backref="spot", cascade="all, delete-orphan")

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
            "category": self.category,
            "owner_id": self.owner_id,
            "is_approved": self.is_approved,
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
    status = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True)
    reports = relationship("Report", backref="event", cascade="all, delete-orphan")

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