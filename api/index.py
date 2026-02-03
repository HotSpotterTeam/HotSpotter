import sys
import os

# Add the server directory to Python path
server_path = os.path.join(os.path.dirname(__file__), "..", "server")
sys.path.insert(0, server_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Create a new FastAPI app for Vercel (without the scheduler lifespan)
app = FastAPI(title="HotSpotter API")

# Test endpoint to verify deployment works
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "server_path": server_path, "sys_path": sys.path[:3]}

# Try to import routers - catch errors for debugging
ROUTERS_LOADED = False
IMPORT_ERROR = ""
try:
    from app.api import auth, events, reports, admin, utils, spots, favorites, notifications, admin_metrics
    ROUTERS_LOADED = True
except Exception as e:
    IMPORT_ERROR = str(e)
    logger.error(f"Failed to import routers: {e}")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers if loaded successfully
if ROUTERS_LOADED:
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
    if not ROUTERS_LOADED:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Routers failed to load", "error": IMPORT_ERROR}
        )
    return {"status": "success", "message": "HotSpotter API is running"}


@app.get("/api", tags=["root"])
async def api_root():
    if not ROUTERS_LOADED:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Routers failed to load", "error": IMPORT_ERROR}
        )
    return {"status": "success", "message": "HotSpotter API is running"}
