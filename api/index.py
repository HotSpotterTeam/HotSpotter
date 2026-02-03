import sys
import os

# Add the server directory to Python path
server_path = os.path.join(os.path.dirname(__file__), "..", "server")
sys.path.insert(0, server_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from the server app
from app.api import auth, events, reports, admin, utils, spots, favorites, notifications, admin_metrics

# Create FastAPI app (without scheduler lifespan for serverless)
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


@app.get("/")
async def root():
    return {"status": "success", "message": "HotSpotter API is running"}


@app.get("/api")
async def api_root():
    return {"status": "success", "message": "HotSpotter API is running"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}
