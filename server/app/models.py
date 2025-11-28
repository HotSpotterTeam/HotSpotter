from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, MetaData, Time
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    metadata = MetaData()


class User(Base):
    """User model."""

    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password = Column(String)


class Event(Base):
    """Event model."""

    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    description = Column(String)
    location = Column(Geometry(geometry_type="POINT"))
    date = Column(DateTime)
    time = Column(Time)
    category = Column(String)
    status = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))

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
            "date": self.date.isoformat() if self.date else None,
            "time": self.time.isoformat() if self.time else None,
            "category": self.category,
            "status": self.status,
        }


class Report(Base):
    """Report model."""

    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    date = Column(DateTime)
    time = Column(Time)
    category = Column(String)
    status = Column(String)
