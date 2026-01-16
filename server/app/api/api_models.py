from pydantic import BaseModel,field_validator
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
    start_time: str
    end_time: str
    category: str
    external_link: Optional[str] = None
    spot_id: Optional[int] = None
    custom_location: Optional[List[float]] = None

    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, end_time: str, info) -> str:
        """Validate that end_time is after start_time"""
        if 'start_time' in info.data:
            start = datetime.fromisoformat(info.data['start_time'])
            end = datetime.fromisoformat(end_time)
            if end <= start:
                raise ValueError('end_time must be after start_time')
        return end_time


class Event(BaseModel):
    id: int
    name: str
    description: str
    location: Optional[List[float]]  # Always present in response
    start_time: str
    end_time: str
    category: str
    external_link: Optional[str] = None
    status: str
    spot_id: Optional[int] = None
    spot_name: Optional[str] = None
    owner_id: Optional[int] = None  # Optional to handle legacy data, but should always be set for new events

class CreateReportFlag(BaseModel):
    category: str
    reason: Optional[str] = None

class ReportFlag(BaseModel):
    id: int
    user_id: int
    category: str
    reason: Optional[str] = None
    created_at: Optional[str] = None

class Report(BaseModel):
    id: int
    event_id: int
    spot_id: int
    user_id: int
    user_name: str
    description: str
    picture: Optional[str] = None
    date: str
    time: str
    status: str
    is_flagged: bool
    score: Optional[int] = None
    flags: List[ReportFlag] = []

class CreateReport(BaseModel):
    description: str
    picture: Optional[str] = None
    event_id: Optional[int] = None
    spot_id: Optional[int] = None
    score: Optional[int] = None

class EventsResponse(BaseModel):
    status: str
    data: List[Event]
    total: int = 0

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
    external_link: str | None
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
    external_link: str | None = None
    spot_type: str = 'permanent'  # 'permanent' or 'temporary'
    permanence_reason: str | None = None
    expires_at: datetime | None = None


class UpdateSpot(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    location: list[float] | None = None
    address: str | None = None
    external_link: str | None = None
    spot_type: str | None = None
    permanence_reason: str | None = None
    expires_at: datetime | None = None

class UpdateEvent(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    external_link: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

    @field_validator('end_time')
    @classmethod
    def validate_end_time(cls, end_time: Optional[str], info) -> Optional[str]:
        """Validate that end_time is after start_time if both are provided"""
        if end_time and 'start_time' in info.data and info.data['start_time']:
            start = datetime.fromisoformat(info.data['start_time'])
            end = datetime.fromisoformat(end_time)
            if end <= start:
                raise ValueError('end_time must be after start_time')
        return end_time

class UpdateReport(BaseModel):
    description: Optional[str] = None
    picture: Optional[str] = None
    # We do not allow changing which event/spot the report is attached to.

class UsersResponse(BaseModel):
    status: str
    data: List[UserResponse]
    total: int