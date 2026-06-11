"""Memory engine tests. Embeddings are faked — no model download in CI."""

from pathlib import Path
from unittest.mock import patch

import pytest

from neuraclaw.config import MIGRATIONS_DIR
from neuraclaw.db import migrate, open_db
from neuraclaw.memory import extractor, store

# Deterministic fake embeddings: hash words into a small dense vector so that
# identical texts collide and different texts (almost surely) don't.
DIM = 384


def fake_vector(text: str) -> list[float]:
    vec = [0.0] * DIM
    for word in text.lower().split():
        vec[hash(word) % DIM] += 1.0
    norm = sum(x * x for x in vec) ** 0.5 or 1.0
    return [x / norm for x in vec]


async def fake_embed(texts: list[str]) -> list[list[float]]:
    return [fake_vector(t) for t in texts]


@pytest.fixture
async def db(tmp_path: Path):
    conn = await open_db(tmp_path / "test.db")
    await migrate(conn, MIGRATIONS_DIR)
    with patch("neuraclaw.memory.embedder.embed", side_effect=fake_embed):
        yield conn
    await conn.close()


async def test_add_and_list(db):
    mid = await store.add_memory(db, type="preference", content="User prefers dark mode")
    assert mid is not None
    memories = await store.list_memories(db)
    assert len(memories) == 1
    assert memories[0].content == "User prefers dark mode"


async def test_exact_duplicate_is_deduplicated(db):
    first = await store.add_memory(db, type="preference", content="User prefers dark mode")
    dup = await store.add_memory(db, type="preference", content="User prefers dark mode")
    assert first is not None
    assert dup is None


async def test_different_type_not_deduplicated(db):
    a = await store.add_memory(db, type="preference", content="User prefers dark mode")
    b = await store.add_memory(db, type="fact", content="User prefers dark mode")
    assert a is not None and b is not None


async def test_hybrid_search_finds_by_keyword(db):
    await store.add_memory(db, type="project", content="User builds NeuraClaw agent platform")
    await store.add_memory(db, type="fact", content="User lives in Kolkata")
    results = await store.search_memories(db, "agent platform")
    assert results
    assert "NeuraClaw" in results[0].content


async def test_forget(db):
    mid = await store.add_memory(db, type="fact", content="User lives in Kolkata")
    assert await store.forget_memory(db, mid)
    assert await store.list_memories(db) == []
    assert not await store.forget_memory(db, 9999)


async def test_always_injected_only_identity_and_preference(db):
    await store.add_memory(db, type="identity", content="User is named Arghya")
    await store.add_memory(db, type="event", content="Meeting on 2026-06-15")
    always = await store.always_injected(db)
    assert [m.type for m in always] == ["identity"]


def test_extractor_parses_json_array():
    text = 'Here you go:\n[{"type": "preference", "content": "User prefers terse replies", "confidence": 0.9}]'
    out = extractor._parse_candidates(text)
    assert len(out) == 1
    assert out[0].type == "preference"


def test_extractor_tolerates_garbage():
    assert extractor._parse_candidates("no json here") == []
    assert extractor._parse_candidates('[{"bad": true}]') == []
    assert extractor._parse_candidates('{"not": "an array"}') == []
