from pydantic import BaseModel
from datetime import datetime, time
from typing import List


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
