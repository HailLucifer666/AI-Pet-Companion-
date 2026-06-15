"""FastAPI app factory: lifespan owns the DB and router, serves frontend if built."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ..config import DB_PATH, FRONTEND_DIST, MIGRATIONS_DIR, WORKSPACE_DIR, load_config
from ..db import migrate, open_db
from ..providers import Router
from ..tools import build_registry
from ..core import scheduler
from .routes import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    config = load_config()
    db = await open_db(DB_PATH)
    await migrate(db, MIGRATIONS_DIR)
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
    app.state.config = config
    app.state.db = db
    app.state.router = Router(config, db)
    app.state.registry = build_registry(config)

    # Start the proactive scheduler loop
    scheduler_task = asyncio.create_task(
        scheduler.run_loop(db, app.state.router, app.state.registry, config)
    )

    yield

    scheduler_task.cancel()
    await db.close()


def create_app() -> FastAPI:
    app = FastAPI(title="NeuraClaw V3", lifespan=lifespan)
    app.include_router(api_router, prefix="/api")
    if FRONTEND_DIST.exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

        # SPA fallback: client-side routes (/chat, /memory, ...) must serve
        # index.html, not 404 — the React router takes it from there.
        @app.get("/{path:path}", include_in_schema=False)
        async def spa(path: str):
            candidate = (FRONTEND_DIST / path).resolve()
            if (
                path
                and candidate.is_file()
                and FRONTEND_DIST.resolve() in candidate.parents
            ):
                return FileResponse(candidate)
            return FileResponse(FRONTEND_DIST / "index.html")

    return app
