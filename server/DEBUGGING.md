# Debugging the HotSpotter FastAPI server

This document explains how to debug the FastAPI server in VS Code.

## Quick options

1) Launch Uvicorn directly (recommended for interactive debugging — no auto-reload):

- Open the Debug pane and choose **Python: Uvicorn (no-reload)** then press Start (F5).
- This runs `uvicorn app.main:app` from the `server/` folder so relative imports like `from .api` resolve correctly.

2) Attach to a running server started with debugpy (useful if you want `--reload`):

- Install debugpy:

```bash
pip install debugpy
```

- Start the server with debugpy listening, then attach from VS Code:

```bash
# starts uvicorn with reload and waits for debugger to attach
python -m debugpy --listen 5678 --wait-for-client -m uvicorn app.main:app --reload --port 8000
```

- In VS Code, run **Python: Attach (debugpy)** to connect to the running process.

## Notes & tips

- Avoid debugging with `--reload` if possible (it spawns worker subprocesses which complicate debugging). If you must use `--reload`, prefer the attach method.
- Ensure your launch configuration's `cwd` is set to `${workspaceFolder}/server` so `app` package resolves correctly.
- Add breakpoints in your Python files (e.g., `server/app/hotspotter_logging.py` or `server/app/main.py`) and they will be hit when code executes.
- If you want `debugpy` to be available in your environment permanently, add `debugpy` to `server/requirements.txt`.

## Quick helper script

A convenience script is provided at `server/run_debug.py` that listens for a debugger and then runs the server.

```bash
# install deps (if not already installed):
pip install -r server/requirements.txt

# run the helper (it will wait for the debugger to attach):
python server/run_debug.py
```

- In VS Code, run the **Python: Attach (debugpy)** configuration to connect and then set breakpoints and exercise endpoints.

If you want, I can run the helper here to show it prints the "waiting for debugger" message.
