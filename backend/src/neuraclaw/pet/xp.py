"""Pet XP engine — server-side only.

Light is conserved: XP is earned solely from real work (PRD §3.3), never from
affection or play. Every award is rate-limited per day per type (anti-farming),
and deleting a memory claws its light back. Stage is *monotonic* — clawing back
XP never un-widens the world (the realms you've reached stay reached).

Awards publish onto Synapse so the world can react: `xp.awarded`, and on a
boundary crossing `pet.levelup` (the Blooming) / `pet.stage` (the Widening).
All no-op before hatch (no pet row).
"""

from __future__ import annotations

import aiosqlite

from ..core.synapse import synapse

# event type -> XP (PRD §3.3). Failed tool calls / dedup'd memories never call award().
XP_RATES: dict[str, int] = {
    "conversation": 2,       # a completed user<->assistant exchange
    "memory_formed": 5,      # survived dedup + plausibility
    "tool_ok": 3,            # tool executed successfully
    "note_created": 5,       # note/document created via the agent
    "skill_drafted": 10,     # agent proposed a skill draft
    "skill_approved": 25,    # user approved a draft
    "skill_reused": 5,       # an approved skill was used again
    "job_completed": 5,      # a scheduled job finished
    "proactive_useful": 15,  # a proactive message the user engaged with
}

# Max positive awards per type per (UTC) day. Generous — anti-farming, not punitive.
DAILY_CAPS: dict[str, int] = {
    "conversation": 60,
    "memory_formed": 50,
    "tool_ok": 80,
    "note_created": 25,
    "skill_drafted": 10,
    "skill_approved": 25,
    "skill_reused": 40,
    "job_completed": 40,
    "proactive_useful": 12,
}

# Cumulative XP gating each life stage: 1 Hatchling, 2 Juvenile, 3 Adult, 4 Elder.
STAGE_THRESHOLDS = (0, 250, 1000, 3000)
XP_PER_LEVEL = 100  # a "level" (the Blooming) every 100 XP, within/across stages


def stage_for_xp(xp: int) -> int:
    """1..4 — the highest stage whose threshold is reached."""
    stage = 1
    for i, threshold in enumerate(STAGE_THRESHOLDS):
        if xp >= threshold:
            stage = i + 1
    return stage


def level_for_xp(xp: int) -> int:
    return xp // XP_PER_LEVEL


async def get_pet(db: aiosqlite.Connection) -> dict | None:
    cur = await db.execute(
        "SELECT id, name, user_name, voice, stage, xp, mood, traits_json,"
        " hatched_at, last_seen_at FROM pet WHERE id = 1"
    )
    row = await cur.fetchone()
    return dict(row) if row else None


async def ensure_pet(
    db: aiosqlite.Connection,
    *,
    name: str,
    user_name: str = "",
    voice: str = "warm",
    traits_json: str | None = None,
) -> dict:
    """Create the singleton pet row if absent (used by hatch + tests). Idempotent."""
    await db.execute(
        "INSERT OR IGNORE INTO pet (id, name, user_name, voice, traits_json)"
        " VALUES (1, ?, ?, ?, ?)",
        (name, user_name, voice, traits_json),
    )
    await db.commit()
    pet = await get_pet(db)
    assert pet is not None  # just inserted (or already existed)
    return pet


async def _awarded_today(db: aiosqlite.Connection, event_type: str) -> int:
    cur = await db.execute(
        "SELECT COUNT(*) FROM xp_events"
        " WHERE type = ? AND amount > 0 AND created_at >= date('now')",
        (event_type,),
    )
    return (await cur.fetchone())[0]


async def award(
    db: aiosqlite.Connection, event_type: str, *, ref: str | None = None
) -> dict | None:
    """Award XP for a real event. Returns a summary, or None before hatch.

    Capped awards return ``{"capped": True, ...}`` without changing XP.
    """
    if event_type not in XP_RATES:
        raise ValueError(f"Unknown XP event type {event_type!r}")
    pet = await get_pet(db)
    if pet is None:
        return None  # pre-hatch: nothing to grow yet

    if await _awarded_today(db, event_type) >= DAILY_CAPS[event_type]:
        return {"capped": True, "awarded": 0, "xp": pet["xp"], "stage": pet["stage"]}

    amount = XP_RATES[event_type]
    await db.execute(
        "INSERT INTO xp_events (type, amount, ref) VALUES (?, ?, ?)",
        (event_type, amount, ref),
    )
    old_xp, old_stage = pet["xp"], pet["stage"]
    new_xp = old_xp + amount
    new_stage = max(old_stage, stage_for_xp(new_xp))
    await db.execute(
        "UPDATE pet SET xp = ?, stage = ?, last_seen_at = datetime('now') WHERE id = 1",
        (new_xp, new_stage),
    )
    await db.commit()

    synapse.publish("xp.awarded", amount=amount, total=new_xp, stage=new_stage)
    if level_for_xp(new_xp) > level_for_xp(old_xp):
        synapse.publish("pet.levelup", level=level_for_xp(new_xp), total=new_xp)
    if new_stage > old_stage:
        synapse.publish("pet.stage", stage=new_stage)

    return {
        "capped": False,
        "awarded": amount,
        "xp": new_xp,
        "stage": new_stage,
        "level": level_for_xp(new_xp),
    }


async def claw_back(
    db: aiosqlite.Connection, event_type: str, *, ref: str | None = None
) -> dict | None:
    """Reclaim XP when its source is removed (e.g. a memory deleted). Floors at 0;
    stage never regresses (no un-widening). No-op before hatch."""
    if event_type not in XP_RATES:
        raise ValueError(f"Unknown XP event type {event_type!r}")
    pet = await get_pet(db)
    if pet is None:
        return None

    amount = -XP_RATES[event_type]
    await db.execute(
        "INSERT INTO xp_events (type, amount, ref) VALUES (?, ?, ?)",
        (event_type, amount, ref),
    )
    old_xp = pet["xp"]
    new_xp = max(0, old_xp + amount)
    await db.execute(
        "UPDATE pet SET xp = ?, last_seen_at = datetime('now') WHERE id = 1",
        (new_xp,),
    )
    await db.commit()

    delta = new_xp - old_xp  # <= 0
    if delta:
        synapse.publish("xp.awarded", amount=delta, total=new_xp, stage=pet["stage"])
    return {"clawed_back": -delta, "xp": new_xp, "stage": pet["stage"]}
