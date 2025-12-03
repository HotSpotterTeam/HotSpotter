from pydantic import BaseModel
from datetime import datetime, time
from typing import List, Optional


class GoogleLoginRequest(BaseModel):
    token: str


class UserResponse(BaseModel):
    id: int
    username: Optional[str]
    email: str
    name: Optional[str]
    picture: Optional[str]


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
    date: datetime
    time: time
    category: str
    status: str


class Event(CreateEvent):
    id: int


class Report(BaseModel):
    id: int
    event_id: int
    user_id: int
    description: str
    date: datetime
    time: time
    category: str
    status: str


class EventsResponse(BaseModel):
    status: str
    data: List[Event]


class EventResponse(BaseModel):
    status: str
    data: Event


class ReportResponse(BaseModel):
    status: str
    data: Report