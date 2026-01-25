from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.hs_logging import middleware_http_request_logger
import logging

from .api import auth, events, reports, admin, utils, spots, favorites,notifications, admin_metrics
from .scheduler import start_scheduler, stop_scheduler, schedule_event_status_updates, schedule_trending_cache_refresh

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown events."""
    # Startup
    try:
        start_scheduler()
        schedule_event_status_updates()
        schedule_trending_cache_refresh()
        logger.info("Schedulers started successfully")

        # Initialize trending cache on startup so it's warm from the first request
        from app.trending_cache import refresh_all_trending_scores
        from app.db import get_session
        session = get_session()
        try:
            refresh_all_trending_scores(session)
            logger.info("Trending cache initialized on startup")
        finally:
            session.close()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        # Don't fail the app startup if scheduler fails

    yield

    # Shutdown
    try:
        stop_scheduler()
        logger.info("Schedulers stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {e}")


app = FastAPI(title="HotSpotter API", lifespan=lifespan)

# Allow CORS for local development (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(middleware_http_request_logger)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(utils.router, prefix="/api", tags=["utils"])
app.include_router(spots.router, prefix="/api/spots", tags=["spots"])
app.include_router(favorites.router, prefix="/api", tags=["favorites"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin_metrics.router, prefix="/api/admin/metrics", tags=["Admin Metrics"])


@app.get("/", tags=["root"])
async def root():
    return {"status": "success", "message": "HotSpotter API is running"}