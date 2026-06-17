import pytest
from pathlib import Path
from neuraclaw.api.routes import engage_proactive
from neuraclaw.config import MIGRATIONS_DIR
from neuraclaw.db import migrate, open_db
from fastapi import Request

@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()

class MockApp:
    class State:
        pass
    def __init__(self, db_conn):
        self.state = self.State()
        self.state.db = db_conn

class MockRequest(Request):
    def __init__(self, db_conn):
        self._app = MockApp(db_conn)
    
    @property
    def app(self):
        return self._app

@pytest.mark.asyncio
async def test_proactive_engage_awards_once(db):
    await db.execute("INSERT INTO pet (id, name, xp) VALUES (1, 'Test', 0)")
    await db.execute(
        "INSERT INTO proactive_messages (id, session_id, text) VALUES (1, 's1', 'hello')"
    )
    await db.commit()
    
    req = MockRequest(db)
    
    # First engage
    res = await engage_proactive(1, req)
    assert res["ok"]
    
    # Check XP awarded (15 for proactive_useful)
    cur = await db.execute("SELECT xp FROM pet WHERE id = 1")
    row = await cur.fetchone()
    assert row["xp"] == 15
    
    # Second engage should not award more
    res2 = await engage_proactive(1, req)
    assert res2["ok"]
    
    cur = await db.execute("SELECT xp FROM pet WHERE id = 1")
    row2 = await cur.fetchone()
    assert row2["xp"] == 15
