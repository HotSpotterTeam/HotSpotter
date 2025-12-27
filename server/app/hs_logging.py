from fastapi import Request, Response
import logging
import json
from datetime import datetime
import uuid
import asyncio
from app.db import get_session
from app.models import Http_Log
from starlette.requests import Request as StarletteRequest


logger = logging.getLogger(__name__)


def get_request_session_id(request: Request) -> str | None:
    sid = getattr(request.state, "request_session_id", None)
    return sid

def get_request_start_time(request: Request) -> datetime | None:
    start_time = getattr(request.state, "start_time", None)
    return start_time

async def middleware_http_request_logger(request: Request, call_next):
    """Middleware to log incoming HTTP requests to the database (non-blocking).

    Builds a `Log` record with fields matching `models.Log` and schedules a
    background thread to write it so we don't block request handling.
    """


    request_session_id = str(uuid.uuid4())
    request.state.request_session_id = request_session_id
    request.state.start_time = datetime.now()

    body = await request.body()

    logging_task = asyncio.create_task(log_http_request(request, body))

    async def receive():
        return {
            "type": "http.request",
            "body": body,
            "more_body": False,
        }
    request_copy = StarletteRequest(request.scope, receive)
    
    try:
        response = await call_next(request_copy)
        response_body = await get_response_body(response)
        response_copy =  Response( 
            content=response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

        return response_copy
    #COONTINUE WITH RESPONSE ETC 
    
    finally:

        try:
            await logging_task
        except Exception as e:
            logger.exception(f"Failed to log HTTP request, exception {e}")
            
        
async def get_response_body(response):
    body = b""
    async for chunk in response.body_iterator:
        body += chunk
    return body


async def log_http_request(request, request_body):

    request_session_id = get_request_session_id(request)
    request_start_time = get_request_start_time(request)
    
    method = request.method
    source_url = str(request.base_url)
    dest_url = str(request.url)
    headers = dict(request.headers)

    if request_body:
        body_str = request_body.decode("utf-8", errors="replace")
        data = json.loads(body_str)
    else: 
        data = None
      
    log_data = {
        "id" : request_session_id,
        "request_id": request_session_id,
        "start_time": request_start_time,
        "source_url": source_url,
        "dest_url": dest_url,
        "action": f"{method}",
        "headers": json.dumps(headers),
        "data": json.dumps(data)
    }

    write_log_to_db(log_data)

def write_log_to_db(log_data: dict):
      
    with get_session() as session:
        log_record = Http_Log(**log_data)
        session.add(log_record)
        session.commit()

