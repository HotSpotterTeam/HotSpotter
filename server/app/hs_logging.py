from fastapi import Request
import logging
import json
from datetime import datetime
import uuid
import asyncio
from app.db import get_session
from app.models import Http_Log

logger = logging.getLogger(__name__)


def get_request_session_id(request: Request) -> str | None:
    sid = getattr(request.state, "request_session_id", None)
    return sid


async def middleware_http_request_logger(request: Request, call_next):
    """Middleware to log incoming HTTP requests to the database (non-blocking).

    Builds a `Log` record with fields matching `models.Log` and schedules a
    background thread to write it so we don't block request handling.
    """
    request.state.request_session_id = str(uuid.uuid4())
    
    response = await call_next(request)
    
    await log_http_request(request)

    return response

# def log_db_action(data):
#     request_session_id = get_request_session_id()
#     pass

async def log_http_request(request):
    request_session_id = get_request_session_id(request)

    timestamp = datetime.now()
    method = request.method
    source_url = str(request.base_url)
    dest_url = str(request.url)
    headers = dict(request.headers)
      
    try:
        params = request.json()
    except Exception:
        params = None

    log_data = {
        "id" : request_session_id,
        "request_id": request_session_id,
        "source_url": source_url,
        "dest_url": dest_url,
        "action": f"{method} {dest_url}",
        "headers": json.dumps(headers),
        "params": params if params else None,
    }

    # Write to DB in background so middleware stays non-blocking
    try:
        asyncio.create_task(asyncio.to_thread(write_log_to_db, log_data))
    except Exception:
        logger.exception("Failed to schedule log write")

    # log_data = {
    #     "type": "http",
    #     "action": f"{method} {dest_url}",
    #     "timestamp": timestamp,
    #     "details": json.dumps({
    #         "source_url": source_url,
    #         "headers": headers,
    #         "params": params,
    #         "status_code": getattr(response, "status_code", None),
    #     }, default=str),
    # }

    # # Write to DB in background so middleware stays non-blocking
    # try:
    #     asyncio.create_task(asyncio.to_thread(write_log_to_db, log_data))
    # except Exception:
    #     logger.exception("Failed to schedule log write")

    # pass 

# def log_user_action(data):
#     request_session_id = get_request_session_id()
#     pass

def write_log_to_db(log_data: dict):
      
    with get_session() as session:
        log_record = Http_Log(**log_data)
        session.add(log_record)
        session.commit()