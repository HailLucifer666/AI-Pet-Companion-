import pytest
import datetime
from pathlib import Path
from neuraclaw.core import autonomy_state
from neuraclaw.config import Config, MIGRATIONS_DIR
from neuraclaw.db import migrate, open_db

@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()

@pytest.mark.asyncio
async def test_scheduler_idempotent_last_heartbeat(db):
    # Set it via the autonomy_state
    dt = datetime.datetime.now(datetime.timezone.utc)
    await autonomy_state.record_heartbeat(db, dt)
    
    # Read it back
    dt_read = await autonomy_state.last_heartbeat_at(db)
    assert dt_read is not None
    assert dt_read.isoformat() == dt.isoformat()

@pytest.mark.asyncio
async def test_scheduler_idempotent_last_journal(db):
    day = "2026-06-17"
    await autonomy_state.record_journal_day(db, day)
    read_day = await autonomy_state.last_journal_day(db)
    assert read_day == day

@pytest.mark.asyncio
async def test_scheduler_acts_today(db):
    day = "2026-06-17"
    assert await autonomy_state.acts_today(db, day) == 0
    await autonomy_state.bump_acts_today(db, day)
    await autonomy_state.bump_acts_today(db, day)
    assert await autonomy_state.acts_today(db, day) == 2
    
    # next day resets
    next_day = "2026-06-18"
    assert await autonomy_state.acts_today(db, next_day) == 0
    await autonomy_state.bump_acts_today(db, next_day)
    assert await autonomy_state.acts_today(db, next_day) == 1
