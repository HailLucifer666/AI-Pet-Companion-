from pathlib import Path

import pytest

from neuraclaw.config import MIGRATIONS_DIR
from neuraclaw.db import migrate, open_db
from neuraclaw.db.connection import vec_version


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    yield conn
    await conn.close()


async def test_sqlite_vec_extension_loads(db):
    version = await vec_version(db)
    assert version.startswith("v")


async def test_migrations_apply_once(db):
    applied = await migrate(db, MIGRATIONS_DIR)
    assert applied == list(range(1, len(applied) + 1))  # contiguous from 001
    # Second run is a no-op.
    assert await migrate(db, MIGRATIONS_DIR) == []


async def test_messages_fts_triggers(db):
    await migrate(db, MIGRATIONS_DIR)
    await db.execute("INSERT INTO sessions (id) VALUES ('s1')")
    await db.execute(
        "INSERT INTO messages (session_id, role, content)"
        " VALUES ('s1', 'user', 'the quick brown fox')"
    )
    cur = await db.execute(
        "SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'fox'"
    )
    assert await cur.fetchone() is not None

    await db.execute("UPDATE messages SET content = 'lazy dog' WHERE session_id = 's1'")
    cur = await db.execute("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'fox'")
    assert await cur.fetchone() is None
    cur = await db.execute("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'dog'")
    assert await cur.fetchone() is not None


async def test_vec_roundtrip(db):
    """KNN over a vec0 table works end to end (the pattern memory will use)."""
    await db.execute("CREATE VIRTUAL TABLE vec_t USING vec0(embedding float[4])")
    await db.execute("INSERT INTO vec_t (rowid, embedding) VALUES (1, '[1,0,0,0]')")
    await db.execute("INSERT INTO vec_t (rowid, embedding) VALUES (2, '[0,1,0,0]')")
    cur = await db.execute(
        "SELECT rowid, distance FROM vec_t WHERE embedding MATCH '[1,0,0,0]'"
        " ORDER BY distance LIMIT 1"
    )
    row = await cur.fetchone()
    assert row["rowid"] == 1
