"""SQLite connection: WAL mode + sqlite-vec extension loaded at connect."""

from pathlib import Path

import aiosqlite
import sqlite_vec


async def open_db(path: str | Path) -> aiosqlite.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = await aiosqlite.connect(path)
    await db.enable_load_extension(True)
    await db.load_extension(sqlite_vec.loadable_path())
    await db.enable_load_extension(False)
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    db.row_factory = aiosqlite.Row
    return db


async def vec_version(db: aiosqlite.Connection) -> str:
    """Smoke check that the sqlite-vec extension actually loaded."""
    cur = await db.execute("SELECT vec_version()")
    row = await cur.fetchone()
    return row[0]
