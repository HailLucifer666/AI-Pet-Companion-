"""Pet XP engine: awards, daily caps, claw-backs, stage/level boundaries + events."""

from pathlib import Path

import pytest

from ai_pet_companion.config import MIGRATIONS_DIR
from ai_pet_companion.core.synapse import synapse
from ai_pet_companion.db import migrate, open_db
from ai_pet_companion.pet import xp


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    yield conn
    await conn.close()


def _drain(q) -> list[str]:
    """Collect published event types from a subscriber queue (before unsubscribe)."""
    import asyncio

    types: list[str] = []
    while True:
        try:
            ev = q.get_nowait()
        except asyncio.QueueEmpty:
            break
        if ev is not None:
            types.append(ev.type)
    return types


async def _set_xp(db, *, xp_value: int, stage: int = 1):
    await db.execute("UPDATE pet SET xp = ?, stage = ? WHERE id = 1", (xp_value, stage))
    await db.commit()


def test_stage_for_xp_thresholds():
    assert xp.stage_for_xp(0) == 1
    assert xp.stage_for_xp(249) == 1
    assert xp.stage_for_xp(250) == 2
    assert xp.stage_for_xp(1000) == 3
    assert xp.stage_for_xp(3000) == 4


async def test_award_is_noop_before_hatch(db):
    result = await xp.award(db, "conversation")
    assert result is None
    cur = await db.execute("SELECT COUNT(*) FROM xp_events")
    assert (await cur.fetchone())[0] == 0


async def test_award_bumps_xp_and_logs_event(db):
    await xp.ensure_pet(db, name="Claw")
    result = await xp.award(db, "conversation", ref="s1")
    assert result == {"capped": False, "awarded": 2, "xp": 2, "stage": 1, "level": 0}
    pet = await xp.get_pet(db)
    assert pet["xp"] == 2
    cur = await db.execute("SELECT type, amount, ref FROM xp_events")
    rows = await cur.fetchall()
    assert len(rows) == 1
    assert rows[0]["type"] == "conversation"
    assert rows[0]["amount"] == 2
    assert rows[0]["ref"] == "s1"


async def test_unknown_event_type_raises(db):
    await xp.ensure_pet(db, name="Claw")
    with pytest.raises(ValueError):
        await xp.award(db, "petting")


async def test_daily_cap_blocks_further_awards(db):
    await xp.ensure_pet(db, name="Claw")
    cap = xp.DAILY_CAPS["skill_drafted"]
    # Simulate today's awards already at the cap.
    for _ in range(cap):
        await db.execute(
            "INSERT INTO xp_events (type, amount) VALUES ('skill_drafted', 10)"
        )
    await db.commit()
    result = await xp.award(db, "skill_drafted")
    assert result["capped"] is True
    assert result["awarded"] == 0
    assert (await xp.get_pet(db))["xp"] == 0  # XP unchanged


async def test_stage_crossing_publishes_pet_stage(db):
    await xp.ensure_pet(db, name="Claw")
    await _set_xp(db, xp_value=249, stage=1)
    q = synapse.subscribe()
    result = await xp.award(db, "conversation")  # 249 -> 251 crosses 250
    types = _drain(q)
    synapse.unsubscribe(q)
    assert result["stage"] == 2
    assert "pet.stage" in types
    assert "xp.awarded" in types


async def test_level_crossing_publishes_levelup(db):
    await xp.ensure_pet(db, name="Claw")
    await _set_xp(db, xp_value=99, stage=1)
    q = synapse.subscribe()
    await xp.award(db, "conversation")  # 99 -> 101 crosses level 1
    types = _drain(q)
    synapse.unsubscribe(q)
    assert "pet.levelup" in types


async def test_clawback_floors_at_zero_and_keeps_stage(db):
    await xp.ensure_pet(db, name="Claw")
    await _set_xp(db, xp_value=251, stage=2)
    result = await xp.claw_back(db, "memory_formed", ref="7")  # -5 -> 246
    assert result["xp"] == 246
    assert result["stage"] == 2  # monotonic: no un-widening despite 246 < 250

    await _set_xp(db, xp_value=3, stage=1)
    result = await xp.claw_back(db, "memory_formed")  # -5 floored to 0
    assert result["xp"] == 0


async def test_memory_layer_awards_and_claws_back_xp(db):
    """End-to-end: store.add_memory awards memory_formed; forget claws it back."""
    from unittest.mock import patch

    from ai_pet_companion.memory import store

    async def fake_embed(texts):
        return [[0.0] * 384 for _ in texts]

    await xp.ensure_pet(db, name="Claw")
    with patch("ai_pet_companion.memory.embedder.embed", side_effect=fake_embed):
        mid = await store.add_memory(db, type="fact", content="a durable fact for wiring")
    assert mid is not None
    assert (await xp.get_pet(db))["xp"] == 5

    assert await store.forget_memory(db, mid)
    assert (await xp.get_pet(db))["xp"] == 0


async def test_hatch_creates_pet_regenerates_soul_seeds_memories(db, tmp_path):
    from unittest.mock import patch

    from ai_pet_companion.pet import hatch

    def fake_vector(text: str) -> list[float]:
        vec = [0.0] * 384
        for word in text.lower().split():
            vec[hash(word) % 384] += 1.0
        norm = sum(x * x for x in vec) ** 0.5 or 1.0
        return [x / norm for x in vec]

    async def fake_embed(texts):
        return [fake_vector(t) for t in texts]

    soul = tmp_path / "SOUL.md"
    with patch("ai_pet_companion.memory.embedder.embed", side_effect=fake_embed):
        pet = await hatch.hatch(
            db,
            soul,
            creature_name="Ember",
            user_name="Arghya",
            voice="warm",
            focus="shipping ai_pet_companion",
            boundaries="never email without asking",
        )

    assert pet["name"] == "Ember"
    assert pet["user_name"] == "Arghya"
    text = soul.read_text(encoding="utf-8")
    assert "Ember" in text and "Arghya" in text and "never email without asking" in text
    # Four distinct seeded memories form â†’ 4 Ã— 5 XP.
    assert pet["xp"] >= 15
    cur = await db.execute("SELECT COUNT(*) FROM memories")
    assert (await cur.fetchone())[0] >= 3
