"""
Profiling utilities for performance analysis.
"""
import time
import logging
from functools import wraps
from typing import Callable
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Enable profiling by setting PROFILING_ENABLED=true in environment
PROFILING_ENABLED = False


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to log request timing and identify slow endpoints."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Log slow requests
        if process_time > 0.5:  # Log requests taking more than 500ms
            logger.warning(
                f"SLOW REQUEST: {request.method} {request.url.path} took {process_time:.3f}s"
            )

        response.headers["X-Process-Time"] = str(process_time)
        return response


def time_function(func_name: str = None):
    """Decorator to time function execution."""

    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            name = func_name or func.__name__
            start = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start
                if elapsed > 0.1:  # Log functions taking more than 100ms
                    logger.info(f"[TIMING] {name} took {elapsed:.3f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start
                logger.error(f"[TIMING] {name} failed after {elapsed:.3f}s: {e}")
                raise

        return wrapper

    return decorator


class TimingContext:
    """Context manager for timing code blocks."""

    def __init__(self, name: str):
        self.name = name
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time
        if elapsed > 0.05:  # Log blocks taking more than 50ms
            logger.info(f"[TIMING] {self.name} took {elapsed:.3f}s")
        return False
