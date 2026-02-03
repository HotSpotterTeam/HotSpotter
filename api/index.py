import sys
import os

# Add the server directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Import routers from the server app
from app.api import auth, events, reports, admin, utils, spots, favorites, notifications, admin_metrics

logger = logging.getLogger(__name__)

# Create a new FastAPI app for Vercel (without the scheduler lifespan)
app = FastAPI(title="HotSpotter API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
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


@app.get("/api", tags=["root"])
async def api_root():
    return {"status": "success", "message": "HotSpotter API is running"}
