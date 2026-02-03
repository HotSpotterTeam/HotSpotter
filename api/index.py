from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os

app = FastAPI(title="HotSpotter API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic health check - no imports from server
@app.get("/")
@app.get("/api")
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "python_version": sys.version,
        "env_vars": {
            "DATABASE_URL": "set" if os.getenv("DATABASE_URL") else "NOT SET",
            "JWT_SECRET_KEY": "set" if os.getenv("JWT_SECRET_KEY") else "NOT SET",
        }
    }

# Try importing server code and report errors
@app.get("/api/debug")
async def debug():
    errors = []

    # Test 1: Can we find the server directory?
    server_path = os.path.join(os.path.dirname(__file__), "..", "server")
    server_exists = os.path.exists(server_path)

    if not server_exists:
        errors.append(f"Server path does not exist: {server_path}")
        # List what's in the parent directory
        parent = os.path.dirname(__file__)
        parent_contents = os.listdir(parent) if os.path.exists(parent) else []
        return {"errors": errors, "parent_contents": parent_contents}

    # Test 2: Add to path and try imports
    sys.path.insert(0, server_path)

    try:
        from app import db
        errors.append("db import: OK")
    except Exception as e:
        errors.append(f"db import FAILED: {e}")

    try:
        from app.api import events
        errors.append("events import: OK")
    except Exception as e:
        errors.append(f"events import FAILED: {e}")

    return {
        "server_path": server_path,
        "server_exists": server_exists,
        "server_contents": os.listdir(server_path) if server_exists else [],
        "results": errors
    }
