"""Memory persistence: insert with dedup, hybrid retrieval, supersede/forget."""

import logging
from dataclasses import dataclass

import aiosqlite

from ..core.synapse import synapse
from ..pet import xp as pet_xp
from . import embedder

log = logging.getLogger(__name__)

MEMORY_TYPES = ("identity", "preference", "project", "event", "fact")
DEDUP_COSINE_THRESHOLD = 0.92
RRF_K = 60
DEFAULT_TOP_K = 12


@dataclass
class Memory:
    id: int
    type: str
    content: str
    confidence: float
    created_at: str


def _row_to_memory(row: aiosqlite.Row) -> Memory:
    return Memory(
        id=row["id"],
        type=row["type"],
        content=row["content"],
        confidence=row["confidence"],
        created_at=row["created_at"],
    )


async def add_memory(
    db: aiosqlite.Connection,
    *,
    type: str,
    content: str,
    confidence: float = 1.0,
    source_session_id: str | None = None,
) -> int | None:
    """Insert a memory unless a near-duplicate of the same type already exists.

    Returns the new memory id, or None when deduplicated away.
    """
    if type not in MEMORY_TYPES:
        raise ValueError(f"Unknown memory type {type!r}")
    vector = (await embedder.embed([content]))[0]
    vec_json = embedder.to_vec_json(vector)

    # KNN against existing same-type memories; cosine distance = 1 - similarity.
    cur = await db.execute(
        "SELECT v.memory_id, vec_distance_cosine(v.embedding, ?) AS dist"
        " FROM vec_memories v JOIN memories m ON m.id = v.memory_id"
        " WHERE m.type = ? AND m.superseded_by IS NULL"
        " ORDER BY dist LIMIT 5",
        (vec_json, type),
    )
    for row in await cur.fetchall():
        if 1.0 - row["dist"] >= DEDUP_COSINE_THRESHOLD:
            log.info("memory deduplicated against id=%s", row["memory_id"])
            return None

    cur = await db.execute(
        "INSERT INTO memories (type, content, confidence, source_session_id)"
        " VALUES (?, ?, ?, ?)",
        (type, content, confidence, source_session_id),
    )
    memory_id = cur.lastrowid
    await db.execute(
        "INSERT INTO vec_memories (memory_id, embedding, model_name) VALUES (?, ?, ?)",
        (memory_id, vec_json, embedder.MODEL_NAME),
    )
    await db.commit()
    synapse.publish("memory.formed", memory_id=memory_id, memory_type=type)
    await pet_xp.award(db, "memory_formed", ref=str(memory_id))
    return memory_id


async def forget_memory(db: aiosqlite.Connection, memory_id: int) -> bool:
    cur = await db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
    await db.execute("DELETE FROM vec_memories WHERE memory_id = ?", (memory_id,))
    await db.commit()
    deleted = cur.rowcount > 0
    if deleted:
        synapse.publish("memory.forgotten", memory_id=memory_id)
        await pet_xp.claw_back(db, "memory_formed", ref=str(memory_id))
    return deleted


async def update_memory(db: aiosqlite.Connection, memory_id: int, content: str) -> bool:
    cur = await db.execute(
        "UPDATE memories SET content = ? WHERE id = ?", (content, memory_id)
    )
    if cur.rowcount:
        vector = (await embedder.embed([content]))[0]
        await db.execute(
            "UPDATE vec_memories SET embedding = ?, model_name = ? WHERE memory_id = ?",
            (embedder.to_vec_json(vector), embedder.MODEL_NAME, memory_id),
        )
    await db.commit()
    return cur.rowcount > 0


async def list_memories(
    db: aiosqlite.Connection, *, type: str | None = None, limit: int = 200
) -> list[Memory]:
    sql = (
        "SELECT id, type, content, confidence, created_at FROM memories"
        " WHERE superseded_by IS NULL"
    )
    params: list = []
    if type:
        sql += " AND type = ?"
        params.append(type)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    cur = await db.execute(sql, params)
    return [_row_to_memory(r) for r in await cur.fetchall()]


async def always_injected(db: aiosqlite.Connection) -> list[Memory]:
    """Identity and preference memories go into every context."""
    cur = await db.execute(
        "SELECT id, type, content, confidence, created_at FROM memories"
        " WHERE superseded_by IS NULL AND type IN ('identity', 'preference')"
        " ORDER BY id"
    )
    return [_row_to_memory(r) for r in await cur.fetchall()]


async def search_memories(
    db: aiosqlite.Connection, query: str, *, top_k: int = DEFAULT_TOP_K
) -> list[Memory]:
    """Hybrid retrieval: sqlite-vec KNN + FTS5 BM25, fused with Reciprocal Rank Fusion."""
    if not query.strip():
        return []
    vector = (await embedder.embed([query]))[0]
    cur = await db.execute(
        "SELECT memory_id FROM vec_memories"
        " WHERE embedding MATCH ? ORDER BY distance LIMIT ?",
        (embedder.to_vec_json(vector), top_k * 2),
    )
    dense_ids = [r["memory_id"] for r in await cur.fetchall()]

    sparse_ids: list[int] = []
    fts_query = _fts_escape(query)
    if fts_query:
        cur = await db.execute(
            "SELECT rowid FROM memories_fts WHERE memories_fts MATCH ?"
            " ORDER BY rank LIMIT ?",
            (fts_query, top_k * 2),
        )
        sparse_ids = [r["rowid"] for r in await cur.fetchall()]

    scores: dict[int, float] = {}
    for rank, mid in enumerate(dense_ids):
        scores[mid] = scores.get(mid, 0.0) + 1.0 / (RRF_K + rank + 1)
    for rank, mid in enumerate(sparse_ids):
        scores[mid] = scores.get(mid, 0.0) + 1.0 / (RRF_K + rank + 1)
    if not scores:
        return []

    ranked = sorted(scores, key=lambda m: scores[m], reverse=True)[:top_k]
    placeholders = ",".join("?" * len(ranked))
    cur = await db.execute(
        f"SELECT id, type, content, confidence, created_at FROM memories"
        f" WHERE id IN ({placeholders}) AND superseded_by IS NULL",
        ranked,
    )
    by_id = {r["id"]: _row_to_memory(r) for r in await cur.fetchall()}
    results = [by_id[m] for m in ranked if m in by_id]

    if results:
        ids = ",".join(str(m.id) for m in results)
        await db.execute(
            f"UPDATE memories SET last_accessed_at = datetime('now'),"
            f" access_count = access_count + 1 WHERE id IN ({ids})"
        )
        await db.commit()
    return results


def _fts_escape(query: str) -> str:
    """Quote each term so user text can't break FTS5 query syntax."""
    terms = [t.replace('"', '""') for t in query.split() if t.strip()]
    return " OR ".join(f'"{t}"' for t in terms)


# ── Living Memory Web: a similarity graph over the kept memories ──────────────

GRAPH_SIM_THRESHOLD = 0.45  # cosine ≥ this → the two memories are "related"
GRAPH_TOP_K = 3  # keep each memory's strongest few links so the web stays legible


def graph_edges(
    pairs: list[tuple[int, int, float]], threshold: float, top_k: int
) -> list[tuple[int, int, float]]:
    """Pure: from all (a, b, similarity) pairs keep those ≥ threshold, then each
    node's `top_k` strongest links, de-duplicated and ordered. No DB/IO."""
    strong = [(a, b, s) for (a, b, s) in pairs if s >= threshold]
    by_node: dict[int, list[tuple[float, int]]] = {}
    sim_by_pair: dict[tuple[int, int], float] = {}
    for a, b, s in strong:
        by_node.setdefault(a, []).append((s, b))
        by_node.setdefault(b, []).append((s, a))
        sim_by_pair[(min(a, b), max(a, b))] = s
    keep: set[tuple[int, int]] = set()
    for node, links in by_node.items():
        for s, other in sorted(links, reverse=True)[:top_k]:
            keep.add((min(node, other), max(node, other)))
    return [(a, b, sim_by_pair[(a, b)]) for (a, b) in sorted(keep)]


async def memory_graph(db: aiosqlite.Connection) -> dict:
    """Nodes (id/type/confidence/recency) + similarity edges for the Memory Web.
    Cosine over the stored embeddings, in sqlite-vec; pruned by `graph_edges`."""
    cur = await db.execute(
        "SELECT id, type, confidence, last_accessed_at, access_count, created_at FROM memories"
        " WHERE superseded_by IS NULL"
    )
    nodes = [
        {
            "id": r["id"],
            "type": r["type"],
            "confidence": r["confidence"],
            "last_accessed_at": r["last_accessed_at"],
            "access_count": r["access_count"],
            "created_at": r["created_at"],
        }
        for r in await cur.fetchall()
    ]
    cur = await db.execute(
        "SELECT v1.memory_id AS a, v2.memory_id AS b,"
        " 1.0 - vec_distance_cosine(v1.embedding, v2.embedding) AS sim"
        " FROM vec_memories v1 JOIN vec_memories v2 ON v2.memory_id > v1.memory_id"
        " WHERE v1.memory_id IN (SELECT id FROM memories WHERE superseded_by IS NULL)"
        " AND v2.memory_id IN (SELECT id FROM memories WHERE superseded_by IS NULL)"
    )
    pairs = [(r["a"], r["b"], float(r["sim"])) for r in await cur.fetchall()]
    edges = graph_edges(pairs, GRAPH_SIM_THRESHOLD, GRAPH_TOP_K)
    return {"nodes": nodes, "edges": [{"a": a, "b": b, "sim": round(s, 4)} for a, b, s in edges]}
