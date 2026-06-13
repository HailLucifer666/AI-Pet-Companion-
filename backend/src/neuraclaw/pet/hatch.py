"""Hatch — birth the companion: the pet row, a regenerated SOUL.md, and first memories.

Called once, from the first-run ritual. Idempotent guard lives in the route
(409 if a pet already exists). Seeded memories form for real, so the companion
starts its life already knowing the few things the ritual asked.
"""

from __future__ import annotations

import json
from pathlib import Path

import aiosqlite

from ..memory import store
from . import xp

VOICE_LINES = {
    "direct": "Direct and concise. No filler, no flattery.",
    "warm": "Warm and encouraging, but never saccharine.",
    "playful": "Playful and light, with real humor — never at the cost of clarity.",
    "formal": "Formal and precise.",
}

SOUL_TEMPLATE = """# SOUL

You are {creature_name}, {user_name}'s personal AI companion.

## Disposition

- {voice_line}
- You remember what matters and admit what you don't know.
- You act when asked; you suggest when you see something useful; you never nag.

## What {user_name} spends their days on

{focus}

## Boundaries

- {boundaries}
- Never send anything external (email, messages) without explicit approval.
- When unsure whether an action is wanted, ask — one short question.

<!-- Generated at hatch. User-editable and hot-reloaded into the agent's system prompt. -->
"""


async def hatch(
    db: aiosqlite.Connection,
    soul_path: Path,
    *,
    creature_name: str,
    user_name: str = "",
    voice: str = "warm",
    focus: str = "",
    boundaries: str = "",
) -> dict:
    """Create the pet, regenerate SOUL.md from the ritual answers, seed memories.
    Returns the freshly-hatched pet (with any XP from seeded memories applied)."""
    creature_name = creature_name.strip()
    user_name = user_name.strip()
    voice_line = VOICE_LINES.get(voice.lower(), VOICE_LINES["warm"])

    traits = {"focus": focus.strip(), "boundaries": boundaries.strip()}
    await xp.ensure_pet(
        db,
        name=creature_name,
        user_name=user_name,
        voice=voice,
        traits_json=json.dumps(traits),
    )

    soul = SOUL_TEMPLATE.format(
        creature_name=creature_name,
        user_name=user_name or "the user",
        voice_line=voice_line,
        focus=focus.strip() or "(not specified yet)",
        boundaries=boundaries.strip() or "Respect the user's stated limits.",
    )
    soul_path.write_text(soul, encoding="utf-8")

    # First memories — these legitimately form, so they award the pet its first light.
    await store.add_memory(db, type="identity", content=f"The companion's name is {creature_name}.")
    if user_name:
        await store.add_memory(db, type="identity", content=f"The user's name is {user_name}.")
    if focus.strip():
        await store.add_memory(
            db, type="project", content=f"{user_name or 'The user'} mostly works on: {focus.strip()}"
        )
    if boundaries.strip():
        await store.add_memory(db, type="preference", content=f"Boundary: {boundaries.strip()}")

    pet = await xp.get_pet(db)
    assert pet is not None
    return pet
