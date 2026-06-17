import pytest
import datetime
from pathlib import Path
from neuraclaw.core.scheduler import _run_journal
from neuraclaw.config import Config, MIGRATIONS_DIR
from neuraclaw.db import migrate, open_db

@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()

class MockRouter:
    async def chat_stream(self, *args, **kwargs):
        class Chunk:
            content = '{"summary_md": "It was a good day.", "tomorrow": "I will do more."}'
        yield Chunk()

class MockRouterFail:
    async def chat_stream(self, *args, **kwargs):
        raise Exception("Offline")
        yield

@pytest.mark.asyncio
async def test_journal_guaranteed_write(db):
    config = Config()
    today_str = "2026-06-17"
    
    await db.execute("INSERT INTO pet (id, name, xp, energy, mood) VALUES (1, 'Test', 0, 80, 'content')")
    await db.execute(
        "INSERT OR IGNORE INTO jobs (id, name, type, cron_expr) VALUES "
        "(1, 'heartbeat', 'heartbeat', '0 * * * *'), "
        "(2, 'journal', 'agent_task', '50 23 * * *')"
    )
    await db.commit()
    
    await _run_journal(db, MockRouter(), None, config, today_str)
    
    cur = await db.execute("SELECT * FROM journal WHERE day = ?", (today_str,))
    row = await cur.fetchone()
    assert row is not None
    assert "good day" in row["summary_md"]
    assert "tomorrow" in row["summary_md"].lower()

@pytest.mark.asyncio
async def test_journal_fallback_offline(db):
    config = Config()
    today_str = "2026-06-18"
    
    await db.execute("INSERT OR IGNORE INTO pet (id, name, xp, energy, mood) VALUES (1, 'Test', 0, 80, 'content')")
    await db.execute(
        "INSERT OR IGNORE INTO jobs (id, name, type, cron_expr) VALUES "
        "(1, 'heartbeat', 'heartbeat', '0 * * * *'), "
        "(2, 'journal', 'agent_task', '50 23 * * *')"
    )
    await db.commit()
    
    await _run_journal(db, MockRouterFail(), None, config, today_str)
    
    cur = await db.execute("SELECT * FROM journal WHERE day = ?", (today_str,))
    row = await cur.fetchone()
    assert row is not None
    assert "(offline" in row["summary_md"]
