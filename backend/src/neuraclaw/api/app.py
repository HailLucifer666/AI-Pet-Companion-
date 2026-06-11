"""FastAPI app factory: lifespan owns the DB and router, serves frontend if built."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from ..config import DB_PATH, FRONTEND_DIST, MIGRATIONS_DIR, load_config
from ..db import migrate, open_db
from ..providers import Router
from .routes import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = load_config()
    db = await open_db(DB_PATH)
    await migrate(db, MIGRATIONS_DIR)
    app.state.config = config
    app.state.db = db
    app.state.router = Router(config, db)
    yield
    await db.close()


def create_app() -> FastAPI:
    app = FastAPI(title="NeuraClaw V3", lifespan=lifespan)
    app.include_router(api_router, prefix="/api")
    if FRONTEND_DIST.exists():
        app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    return app
