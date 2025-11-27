from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, MetaData


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
    location = Column(String)
    date = Column(DateTime)
    time = Column(String)
    category = Column(String)
    status = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))


class Report(Base):
    """Report model."""

    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String)
    date = Column(DateTime)
    time = Column(String)
    category = Column(String)
    status = Column(String)
