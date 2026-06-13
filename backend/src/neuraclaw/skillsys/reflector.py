"""Self-improvement: after tool-heavy turns, propose a reusable skill draft."""

import logging
import re

import aiosqlite

from ..core.synapse import synapse
from ..providers import ProviderError, Router
from . import manager
from .loader import parse_skill_md

log = logging.getLogger(__name__)

MIN_TOOL_CALLS = 4  # turns smaller than this rarely contain a reusable procedure

REFLECT_PROMPT = """\
You review an AI agent's completed task to decide if it revealed a REUSABLE procedure
worth saving as a skill (a markdown playbook the agent can reload later).

Reply with exactly NONE if:
- the task was one-off, trivial, or personal-data specific
- a saved skill named in the existing list already covers it

Otherwise reply with ONLY a SKILL.md document in this exact format:

---
name: short-kebab-case-name
description: One sentence on when to use this skill.
risk: READ
---
## Steps
1. ...concrete reusable steps with tool names...

Existing skills: {existing}

Task transcript summary:
{summary}
"""


async def reflect_on_turn(
    db: aiosqlite.Connection,
    router: Router,
    *,
    session_id: str,
    tool_call_count: int,
    summary: str,
    role: str = "cheap",
) -> str | None:
    """Returns the new draft skill name, or None."""
    if tool_call_count < MIN_TOOL_CALLS:
        return None
    cur = await db.execute("SELECT name FROM skills")
    existing = ", ".join(r["name"] for r in await cur.fetchall()) or "(none)"
    prompt = REFLECT_PROMPT.replace("{existing}", existing).replace(
        "{summary}", summary[:6000]
    )
    try:
        resp = await router.chat(role, [{"role": "user", "content": prompt}])
    except ProviderError as e:
        log.warning("skill reflection skipped: %s", e)
        return None

    text = resp.text.strip()
    if not text or text.upper().startswith("NONE"):
        return None
    # Models often wrap output in code fences; strip them.
    text = re.sub(r"\A```(?:markdown|md)?\s*\n|\n```\s*\Z", "", text)
    m = re.search(r"^---\s*$", text, re.MULTILINE)
    if m is None:
        return None
    text = text[m.start():].strip()
    doc = parse_skill_md(text, manager.DRAFTS_DIR / "pending" / "SKILL.md")
    if doc is None or not doc.description:
        return None

    try:
        dest = manager.write_draft(doc.name, text)
    except FileExistsError:
        return None
    await db.execute(
        "INSERT OR IGNORE INTO skills (name, path, description, risk, status, created_by)"
        " VALUES (?, ?, ?, ?, 'draft', 'agent')",
        (doc.name, str(dest), doc.description, doc.risk),
    )
    await db.commit()
    log.info("skill draft proposed: %s (session %s)", doc.name, session_id)
    synapse.publish("skill.drafted", name=doc.name)
    return doc.name
