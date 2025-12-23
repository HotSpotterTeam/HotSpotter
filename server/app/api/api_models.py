from pydantic import BaseModel
from datetime import datetime

from typing import List, Optional, Any


class GoogleLoginRequest(BaseModel):
    token: str


class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: str
    name: Optional[str]
    picture: Optional[str]
    is_admin: bool = False


class LoginResponse(BaseModel):
    status: str
    message: str
    access_token: str
    token_type: str
    user: UserResponse


class CreateEvent(BaseModel):
    name: str
    description: str
    location: List[float]
    date: str
    time: str
    category: str
    status: Optional[str] = "active"
    spot_id: Optional[int] = None
    duration_hours: Optional[int] = 24


class Event(CreateEvent):
    id: int
    spot_id: Optional[int] = None


class Report(BaseModel):
    id: int
    event_id: int
    spot_id: int
    user_id: int
    description: str
    picture: Optional[str] = None
    date: str
    time: str
    status: str
    is_flagged: bool

class CreateReport(BaseModel):
    description: str
    picture: Optional[str] = None
    event_id: Optional[int] = None
    spot_id: Optional[int] = None

class EventsResponse(BaseModel):
    status: str
    data: List[Event]


class EventResponse(BaseModel):
    status: str
    data: Event


class ReportResponse(BaseModel):
    status: str
    data: Report


class SpotResponse(BaseModel):
    id: int
    name: str
    description: str | None
    category: str
    location: list[float]  # [lat, lng]
    address: str | None
    spot_type: str
    permanence_reason: str | None
    source: str
    osm_id: str | None
    owner_id: int
    is_approved: bool
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    last_activity: datetime | None

    class Config:
        from_attributes = True


class SpotsResponse(BaseModel):
    """Response model for list of spots"""
    spots: list[SpotResponse]
    total: int

    class Config:
        from_attributes = True


class CreateSpot(BaseModel):
    name: str
    description: str | None = None
    category: str
    location: list[float]  # [lat, lng]
    address: str | None = None
    spot_type: str = 'permanent'  # 'permanent' or 'temporary'
    permanence_reason: str | None = None
    expires_at: datetime | None = None


class UpdateSpot(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    location: list[float] | None = None
    address: str | None = None
    spot_type: str | None = None
    permanence_reason: str | None = None
    expires_at: datetime | None = None


class UpdateEvent(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    # We generally don't allow moving an event between spots/owners after creation.

class UpdateReport(BaseModel):
    description: Optional[str] = None
    picture: Optional[str] = None
    # We do not allow changing which event/spot the report is attached to.