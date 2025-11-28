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
