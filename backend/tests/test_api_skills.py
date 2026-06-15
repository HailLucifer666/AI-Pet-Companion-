"""The active-skills listing that drives the village's earned monuments.

Tests the business logic (loader.list_active) directly against a migrated DB,
matching the project's test style (test_db.py / test_agent.py) rather than the
HTTP layer â€” the route is a one-line passthrough to this function.
"""

from pathlib import Path

import pytest

from ai_pet_companion.config import MIGRATIONS_DIR
from ai_pet_companion.db import migrate, open_db
from ai_pet_companion.skillsys import loader


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()


async def _seed(conn, name: str, status: str) -> None:
    await conn.execute(
        "INSERT INTO skills (name, path, description, risk, status, created_by)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (name, f"/skills/{name}", f"does {name}", "READ", status, "agent"),
    )
    await conn.commit()


async def test_list_active_excludes_drafts(db):
    await _seed(db, "web-summarize", "active")
    await _seed(db, "half-baked", "draft")
    rows = await loader.list_active(db)
    names = [r["name"] for r in rows]
    assert "web-summarize" in names
    assert "half-baked" not in names  # only-real-data: drafts are NOT monuments
    for field in ("id", "name", "description", "risk", "status", "created_at"):
        assert field in rows[0]
    assert rows[0]["status"] == "active"


async def test_list_active_empty(db):
    assert await loader.list_active(db) == []  # no active skills â†’ [], not an error


async def test_list_active_grows_on_approval(db):
    await _seed(db, "draft-skill", "draft")
    assert await loader.list_active(db) == []
    await db.execute("UPDATE skills SET status = 'active' WHERE name = 'draft-skill'")
    await db.commit()
    assert len(await loader.list_active(db)) == 1
