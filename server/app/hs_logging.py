from fastapi import Request, Response, Depends
import logging
import json
from datetime import datetime, timezone
import uuid
import asyncio
import re
from app.db import get_session
from app.models import Http_Log, User_Action_Log
from starlette.requests import Request as StarletteRequest


logger = logging.getLogger(__name__)


def get_request_session_id(request: Request) -> str | None:
    sid = getattr(request.state, "request_session_id", None)
    return sid

def get_request_start_time(request: Request) -> datetime | None:
    start_time = getattr(request.state, "start_time", None)
    return start_time

async def middleware_http_request_logger(request: Request, call_next):
    """Middleware to log incoming HTTP requests and responses to the database (non-blocking).

    Builds a `Log` record with fields matching `models.Log` and schedules a
    background thread to write it so we don't block request handling.
    """

    # Adding data to request
    request.state.start_time = datetime.now(timezone.utc).replace(microsecond=0).replace(tzinfo=None)
    request_session_id =f"{get_request_start_time(request)}_{str(uuid.uuid4())}"
    request_session_id = re.sub(r"\s+", "_", request_session_id)
    request.state.request_session_id = request_session_id
    
    # Scheduling logging task in paralel in order to not block the request processing
    body = await request.body()
    logging_task = asyncio.create_task(log_http_request(request, body))

    # Re creating the request object since body can be read only once
    async def receive():
        return {
            "type": "http.request",
            "body": body,
            "more_body": False,
        }
    request_copy = StarletteRequest(request.scope, receive)
    
    try:
        # Processing the request
        response = await call_next(request_copy)

        # Processing the response
        b_response_body = await get_response_body(response)
        response_time = datetime.now(timezone.utc).replace(microsecond=0).replace(tzinfo=None)
        response_body = b_response_body.decode("utf-8", errors="ignore")
        status_code = response.status_code
        response_copy =  Response( 
            content=b_response_body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

        return response_copy
    
    except Exception as e:
        logger.exception(f"Exception during request processing: {e}")
        response_time = datetime.now(timezone.utc).replace(microsecond=0).replace(tzinfo=None)
        status_code = 500
        response_body = f"Internal Server Error. {str(e)}"
        raise
    
    finally:
        try:
            await logging_task
            # Adding response to db 
            write_response_to_db(status_code, response_body, request_session_id, response_time)
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
        request_data = request_body.decode("utf-8", errors="replace")
    else: 
        request_data = None
      
    log_data = {
        "id" : request_session_id,
        "request_id": request_session_id,
        "start_time": request_start_time,
        "source_url": source_url,
        "dest_url": dest_url,
        "action": f"{method}",
        "headers": json.dumps(headers),
        "data": request_data
    }

    write_log_to_db(log_data)

def write_log_to_db(log_data: dict):
      
    with get_session() as session:
        log_record = Http_Log(**log_data)
        session.add(log_record)
        session.commit()

def write_response_to_db(status_code, response_body, request_session_id, response_time):
    with get_session() as session:
        log_record = session.query(Http_Log).filter(Http_Log.request_id == request_session_id).first()
        if log_record:
            log_record.response_status_code = status_code
            log_record.response_data = response_body
            log_record.end_time = response_time
            session.commit()

def log_user_action(action, user, data, request_session_id): 
    """Logs a user action to the database ."""

    
    log_entry = User_Action_Log(
        user_name=user.username if user else None,
        user_id=user.id if user else None,
        request_session_id = request_session_id,
        user_role="admin" if user.is_admin else "user",
        timestamp=datetime.now(timezone.utc).replace(microsecond=0).replace(tzinfo=None),
        action=action,
        data=json.dumps(data)
    )

    with get_session() as session:
        session.add(log_entry)
        session.commit()

