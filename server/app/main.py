from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, events, reports, admin, utils, spots

app = FastAPI(title="HotSpotter API (TBD)")

# Allow CORS for local development (adjust origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(utils.router, prefix="/api", tags=["utils"])
app.include_router(spots.router, prefix="/api/spots", tags=["spots"])


@app.get("/", tags=["root"])
async def root():
    return {"status": "TBD", "message": "HotSpotter API scaffold. Endpoints return TBD."}
