"""Context builder: SOUL.md + profile + retrieved memories + recent history."""

import logging
from typing import Any

import aiosqlite

from ..config import SOUL_PATH, AgentConfig
from ..memory import store
from ..skillsys import loader

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

    skills = await loader.active_index(db)
    if skills:
        parts.append(
            "## Skills\n"
            "Saved playbooks. Call `use_skill(name)` to load one before applying it.\n"
            + "\n".join(f"- {s['name']}: {s['description']}" for s in skills[:40])
        )

    parts.append(
        "## Tools\n"
        "Use tools when they help. Use `remember` for durable facts the user shares."
        " Never fabricate tool output. After tools finish, answer the user directly."
    )
    return "\n\n".join(parts)


def build_user_content(text: str, image_b64: str | None) -> str | list[dict[str, Any]]:
    """The latest user turn's content for the model.

    Plain string when there's no image (the common path). When an image is
    attached, an OpenAI-style multimodal content array (text + an ``image_url``
    data-URL) so a vision model can see the screen. The image bytes are passed
    straight through — never logged, never persisted. A bare base64 string is
    wrapped as a PNG data-URL; an already-formed ``data:`` URL is used as-is.
    """
    if not image_b64:
        return text
    url = image_b64 if image_b64.startswith("data:") else f"data:image/png;base64,{image_b64}"
    return [
        {"type": "text", "text": text},
        {"type": "image_url", "image_url": {"url": url}},
    ]


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
