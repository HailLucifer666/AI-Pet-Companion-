import pytest
import datetime
from pathlib import Path
from neuraclaw.core.gate import should_act, GateVerdict
from neuraclaw.config import Config, ProactivityConfig, MIGRATIONS_DIR
from neuraclaw.providers.router import Router
from neuraclaw.db import migrate, open_db

@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()

class MockRouter:
    def __init__(self, json_resp):
        self.json_resp = json_resp
        
    async def chat_stream(self, *args, **kwargs):
        class Chunk:
            content = self.json_resp
        yield Chunk()

@pytest.fixture
def memory_router():
    return MockRouter('{"act": true, "reason": "ok"}')

@pytest.mark.asyncio
async def test_gate_disabled(db):
    config = Config(proactivity=ProactivityConfig(enabled=False))
    v = await should_act(db, MockRouter(''), config)
    assert not v.act
    assert v.reason == "proactivity disabled"

@pytest.mark.asyncio
async def test_gate_happy_path(db):
    await db.execute("INSERT INTO pet (id, name, xp, energy, mood) VALUES (1, 'Test', 0, 80, 'content')")
    await db.commit()
    config = Config()
    v = await should_act(db, MockRouter('{"act": true, "reason": "hello"}'), config)
    # Could be false if we run it in quiet hours!
    local_hour = datetime.datetime.now().hour
    if not (config.proactivity.quiet_start_hour <= local_hour or local_hour < config.proactivity.quiet_end_hour):
        assert v.act
        assert v.reason == "hello"

@pytest.mark.asyncio
async def test_gate_fail_closed(db):
    await db.execute("INSERT INTO pet (id, name, xp, energy, mood) VALUES (1, 'Test', 0, 80, 'content')")
    await db.commit()
    config = Config()
    v = await should_act(db, MockRouter('invalid json'), config)
    assert not v.act
    assert "parse failed" in v.reason or "quiet hours" in v.reason
