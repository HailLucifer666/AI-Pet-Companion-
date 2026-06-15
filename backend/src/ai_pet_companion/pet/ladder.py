"""Growth ladder â€” life stages unlock real capability.

The pet doesn't just *look* grown, it *is* more capable because you raised it.
Locked abilities read as "it will grow into this," never as a paywall, and a
single config flag (`pet.ignore_ladder`) unlocks everything instantly â€” charm
never blocks work (PRD principle 3). Chat / memory / notes are never gated.
"""

from __future__ import annotations

# Tool name -> minimum life stage (1..4) required. Unlisted tools are always open.
TOOL_MIN_STAGE: dict[str, int] = {
    "web_search": 2,   # Juvenile: the pet learns to reach beyond the Grove
    "web_fetch": 2,
    # skill_drafting (reflector) gates at 3, subagents/autonomous_jobs at 4 â€” wired
    # where those capabilities live (v0.3+), using the same min_stage_for() helper.
}

CAPABILITY_PHRASE: dict[str, str] = {
    "web_search": "reach out to the web",
    "web_fetch": "reach out to the web",
}

STAGE_NAMES = {1: "Hatchling", 2: "Juvenile", 3: "Adult", 4: "Elder"}


def min_stage_for(tool_name: str) -> int:
    return TOOL_MIN_STAGE.get(tool_name, 1)


def is_unlocked(tool_name: str, pet_stage: int) -> bool:
    return pet_stage >= min_stage_for(tool_name)


def locked_message(tool_name: str) -> str:
    need = min_stage_for(tool_name)
    phrase = CAPABILITY_PHRASE.get(tool_name, f"use {tool_name}")
    return (
        f"Not grown enough for that yet â€” the ability to {phrase} unlocks at "
        f"{STAGE_NAMES.get(need, f'stage {need}')} (stage {need}). Keep working "
        f"together and it will grow into it. (You can unlock it now in Settings.)"
    )
