"""Async scheduler for proactive companion behaviors: hourly heartbeat and nightly journal."""

import asyncio
import logging
import uuid
from datetime import datetime

import aiosqlite

from . import agent
from .synapse import synapse as _synapse
from ..config import Config
from ..providers import Router
from ..tools import Registry

log = logging.getLogger(__name__)


async def run_loop(
    db: aiosqlite.Connection,
    router: Router,
    registry: Registry,
    config: Config,
) -> None:
    """Run the proactive background loop. To be spawned in lifespan."""
    # Track the last run hour/day in-memory.
    last_heartbeat_hour = -1
    last_journal_day = -1

    log.info("Proactive scheduler started.")

    while True:
        try:
            now = datetime.now()

            # 1. Hourly Heartbeat
            if last_heartbeat_hour != -1 and now.hour != last_heartbeat_hour:
                log.info("Triggering hourly heartbeat...")
                asyncio.create_task(_run_heartbeat(db, router, registry, config))
                last_heartbeat_hour = now.hour
            elif last_heartbeat_hour == -1:
                last_heartbeat_hour = now.hour

            # 2. Nightly Journal (at 23:50)
            if (
                last_journal_day != -1
                and now.hour == 23
                and now.minute >= 50
                and now.day != last_journal_day
            ):
                log.info("Triggering nightly journal...")
                asyncio.create_task(_run_journal(db, router, registry, config))
                last_journal_day = now.day
            elif last_journal_day == -1:
                last_journal_day = now.day

        except Exception as e:
            log.error("Error in scheduler loop: %s", e)

        await asyncio.sleep(60)


async def _run_heartbeat(db, router, registry, config):
    session_id = "internal_monologue"
    # Ensure session exists
    cur = await db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if not await cur.fetchone():
        await db.execute(
            "INSERT INTO sessions (id, title) VALUES (?, ?)",
            (session_id, "Internal Monologue"),
        )

    prompt = "SYSTEM: One hour has passed. You may reflect on recent events, take background actions, or simply rest."

    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, prompt),
    )
    await db.commit()

    role = "background" if "background" in config.roles else "primary"

    try:
        async for _ in agent.run_turn(
            db=db,
            router=router,
            registry=registry,
            config=config,
            session_id=session_id,
            user_text=prompt,
            role=role,
            synapse=_synapse,
        ):
            pass  # Let the agent run its turn silently
    except Exception as e:
        log.error("Heartbeat run_turn failed: %s", e)


async def _run_journal(db, router, registry, config):
    session_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, "Nightly Journal")
    )

    prompt = "SYSTEM: Daily Journal Trigger. Please review your recent memories and update your 'NOW' scratchpad note with your current state and plans."

    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, prompt),
    )
    await db.commit()

    role = "background" if "background" in config.roles else "primary"

    try:
        async for _ in agent.run_turn(
            db=db,
            router=router,
            registry=registry,
            config=config,
            session_id=session_id,
            user_text=prompt,
            role=role,
            synapse=_synapse,
        ):
            pass
    except Exception as e:
        log.error("Journal run_turn failed: %s", e)

    # Archive the journal session so it doesn't clutter the UI session list.
    await db.execute("UPDATE sessions SET archived = 1 WHERE id = ?", (session_id,))
    await db.commit()
