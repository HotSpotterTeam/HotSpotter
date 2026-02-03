"""
Vercel Cron Job endpoint for scheduled tasks.
This replaces the APScheduler that doesn't work in serverless.
"""
import sys
import os

# Add the server directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/api/cron")
async def cron_handler(request: Request):
    """
    Cron endpoint to update event statuses.
    Called by Vercel Cron Jobs every 5 minutes.
    """
    # Verify the request is from Vercel Cron (optional security)
    auth_header = request.headers.get("Authorization")
    cron_secret = os.getenv("CRON_SECRET")

    if cron_secret and auth_header != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        from app.event_status_updater import update_event_statuses
        result = update_event_statuses()
        return JSONResponse(content={"success": True, "updated": result})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
