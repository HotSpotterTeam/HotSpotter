"""Run the FastAPI app under debugpy and wait for a debugger to attach.

Usage:
    python run_debug.py

This listens on port 5678 and blocks until a debugger attaches, which makes
breakpoints reliable even with hot-reload disabled.
"""
import debugpy
import uvicorn

DEBUG_PORT = 5678

if __name__ == "__main__":
    debugpy.listen(("0.0.0.0", DEBUG_PORT))
    print(f"debugpy listening on port {DEBUG_PORT}; waiting for debugger to attach...")
    debugpy.wait_for_client()
    # Start uvicorn without reload for predictable single-process debugging
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
