"""Context builder: SOUL.md + profile + retrieved memories + recent history."""

import logging
from typing import Any

import aiosqlite

from ..config import SOUL_PATH, AgentConfig
from ..memory import store

log = logging.getLogger(__name__)

FALLBACK_SOUL = "You are NeuraClaw, a direct and concise personal AI assistant."


def load_soul() -> str:
    try:
        return SOUL_PATH.read_text(encoding="utf-8").strip()
    except OSError:
        return FALLBACK_SOUL


async def build_system_prompt(db: aiosqlite.Connection, query: str) -> str:
    parts = [load_soul()]

    cur = await db.execute("SELECT key, value FROM user_profile ORDER BY key")
    profile = await cur.fetchall()
    if profile:
        parts.append(
            "## User profile\n" + "\n".join(f"- {r['key']}: {r['value']}" for r in profile)
        )

    always = await store.always_injected(db)
    retrieved = await store.search_memories(db, query) if query.strip() else []
    seen = {m.id for m in always}
    memories = always + [m for m in retrieved if m.id not in seen]
    if memories:
        parts.append(
            "## Memories\n"
            + "\n".join(f"- ({m.type}) {m.content}" for m in memories[:24])
        )

    parts.append(
        "## Tools\n"
        "Use tools when they help. Use `remember` for durable facts the user shares."
        " Never fabricate tool output. After tools finish, answer the user directly."
    )
    return "\n\n".join(parts)


async def load_history(
    db: aiosqlite.Connection, session_id: str, agent_config: AgentConfig
) -> list[dict[str, Any]]:
    """Recent messages in OpenAI format, oldest first. Tool messages included."""
    cur = await db.execute(
        "SELECT role, content, tool_calls_json, tool_call_id FROM messages"
        " WHERE session_id = ? ORDER BY id DESC LIMIT ?",
        (session_id, agent_config.history_messages),
    )
    rows = list(await cur.fetchall())[::-1]
    # Drop leading tool messages orphaned by the window cut (API rejects them).
    while rows and rows[0]["role"] == "tool":
        rows = rows[1:]
    out: list[dict[str, Any]] = []
    for r in rows:
        msg: dict[str, Any] = {"role": r["role"], "content": r["content"]}
        if r["tool_calls_json"]:
            import json

            msg["tool_calls"] = json.loads(r["tool_calls_json"])
        if r["tool_call_id"]:
            msg["tool_call_id"] = r["tool_call_id"]
        out.append(msg)
    return out
