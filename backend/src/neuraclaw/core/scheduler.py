"""Async scheduler for proactive companion behaviors: hourly heartbeat and nightly journal."""

import asyncio
import json
import logging
import uuid
import datetime

import aiosqlite

from . import agent
from .synapse import synapse as _synapse
from . import autonomy_state
from . import gate
from ..config import Config
from ..providers import Router
from ..tools import Registry
from ..pet import xp
from ..pet import mood as pet_mood

log = logging.getLogger(__name__)


async def run_loop(
    db: aiosqlite.Connection,
    router: Router,
    registry: Registry,
    config: Config,
) -> None:
    """Run the proactive background loop. To be spawned in lifespan."""
    log.info("Proactive scheduler started.")

    # Initialize synthetic jobs if missing
    await db.execute(
        "INSERT OR IGNORE INTO jobs (name, type, cron_expr) VALUES "
        "('heartbeat', 'heartbeat', '0 * * * *'), "
        "('journal', 'agent_task', '50 23 * * *')"
    )
    await db.commit()

    while True:
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            local_now = datetime.datetime.now()

            # 1. Hourly Heartbeat
            last_hb = await autonomy_state.last_heartbeat_at(db)
            hb_due = True
            if last_hb:
                if last_hb.tzinfo is None:
                    last_hb = last_hb.replace(tzinfo=datetime.timezone.utc)
                if (now - last_hb).total_seconds() < 55 * 60:
                    hb_due = False

            if hb_due:
                log.info("Evaluating hourly heartbeat...")
                await autonomy_state.record_heartbeat(db, now)
                
                # Check gate
                verdict = await gate.should_act(db, router, config)
                if verdict.act:
                    log.info("Heartbeat escalated: %s", verdict.reason)
                    asyncio.create_task(_run_heartbeat(db, router, registry, config))
                else:
                    log.debug("Heartbeat rested: %s", verdict.reason)
                    await _record_skipped_job(db, "heartbeat", verdict.reason)
                    
            # 2. Nightly Journal
            last_journal = await autonomy_state.last_journal_day(db)
            today_str = local_now.strftime("%Y-%m-%d")
            
            jh = config.proactivity.journal_hour
            jm = config.proactivity.journal_minute
            
            if (
                local_now.hour == jh
                and local_now.minute >= jm
                and last_journal != today_str
            ):
                log.info("Triggering nightly journal...")
                await autonomy_state.record_journal_day(db, today_str)
                asyncio.create_task(_run_journal(db, router, registry, config, today_str))

        except Exception as e:
            log.error("Error in scheduler loop: %s", e)

        try:
            await pet_mood.recompute(db)
        except Exception as e:
            log.error("Error recomputing mood: %s", e)

        await asyncio.sleep(60)


async def _record_skipped_job(db, name: str, reason: str):
    cur = await db.execute("SELECT id FROM jobs WHERE name = ?", (name,))
    job_row = await cur.fetchone()
    if job_row:
        await db.execute(
            "INSERT INTO job_runs (job_id, status, error) VALUES (?, 'skipped', ?)",
            (job_row["id"], reason)
        )
        await db.commit()


async def _run_heartbeat(db, router, registry, config):
    session_id = "internal_monologue"
    cur = await db.execute("SELECT id FROM jobs WHERE name = 'heartbeat'")
    job_row = await cur.fetchone()
    job_id = job_row["id"] if job_row else 1
    
    cur = await db.execute(
        "INSERT INTO job_runs (job_id, status) VALUES (?, 'running')",
        (job_id,)
    )
    run_id = cur.lastrowid
    await db.commit()

    cur = await db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
    if not await cur.fetchone():
        await db.execute(
            "INSERT INTO sessions (id, title) VALUES (?, ?)",
            (session_id, "Internal Monologue"),
        )

    prompt = "SYSTEM: You decided to speak up. Take a proactive action or share a thought."

    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, prompt),
    )
    await db.commit()

    role = "primary"
    final_text = ""

    try:
        async for event in agent.run_turn(
            db=db,
            router=router,
            registry=registry,
            config=config,
            session_id=session_id,
            user_text=prompt,
            role=role,
            synapse=_synapse,
        ):
            if event.type == "done":
                final_text = event.text
                
        # Write proactive_messages
        if final_text:
            cur = await db.execute(
                "INSERT INTO proactive_messages (session_id, text, kind) VALUES (?, ?, 'heartbeat')",
                (session_id, final_text)
            )
            msg_id = cur.lastrowid
            _synapse.publish("proactive.message", id=msg_id, kind="heartbeat", text=final_text[:280])
            
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        await autonomy_state.bump_acts_today(db, today)
        
        await db.execute("UPDATE job_runs SET status = 'ok' WHERE id = ?", (run_id,))
        await db.commit()
        await xp.award(db, "job_completed", ref="heartbeat")

    except Exception as e:
        log.error("Heartbeat run_turn failed: %s", e)
        await db.execute("UPDATE job_runs SET status = 'error', error = ? WHERE id = ?", (str(e), run_id))
        await db.commit()


async def _run_journal(db, router, registry, config, today_str: str):
    session_id = str(uuid.uuid4())
    
    cur = await db.execute("SELECT id FROM jobs WHERE name = 'journal'")
    job_row = await cur.fetchone()
    job_id = job_row["id"] if job_row else 2
    
    cur = await db.execute(
        "INSERT INTO job_runs (job_id, status) VALUES (?, 'running')",
        (job_id,)
    )
    run_id = cur.lastrowid
    await db.commit()

    await db.execute(
        "INSERT INTO sessions (id, title) VALUES (?, ?)", (session_id, "Nightly Journal")
    )
    
    # Gather digest
    cur = await db.execute(
        "SELECT type, COUNT(*) as c FROM xp_events WHERE created_at LIKE ? GROUP BY type",
        (f"{today_str}%",)
    )
    events = await cur.fetchall()
    events_summary = ", ".join(f"{r['c']} {r['type']}" for r in events) or "no events"
    
    cur = await db.execute("SELECT mood, energy FROM pet WHERE id = 1")
    pet = await cur.fetchone()
    mood = pet["mood"] if pet else "content"
    energy = pet["energy"] if pet else 80

    prompt = (
        "SYSTEM: Daily Journal Trigger. Please reflect on today. "
        f"Activity: {events_summary}. Mood: {mood}, Energy: {energy}. "
        "Reply with ONLY JSON: {\"summary_md\": \"<first-person NOW scratchpad>\", \"tomorrow\": \"<one intention>\"}"
    )

    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)",
        (session_id, prompt),
    )
    await db.commit()

    role = "primary" # The spec says: "smart-model journaling cost optimization ... journal uses primary for quality once/day"
    acc = ""
    success = False
    
    try:
        # Use simple chat stream without tools to get the JSON
        messages = [{"role": "system", "content": prompt}]
        stream = router.chat_stream(
            messages=messages,
            role=role,
            tools=[],
            model=None
        )
        async for chunk in stream:
            acc += chunk.content
            
        start = acc.find("{")
        end = acc.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(acc[start:end+1])
            summary_md = data.get("summary_md", "")
            tomorrow = data.get("tomorrow", "")
            full_text = f"{summary_md}\n\n**Tomorrow:** {tomorrow}"
            
            await db.execute(
                "INSERT INTO journal (day, summary_md, mood) VALUES (?, ?, ?) "
                "ON CONFLICT(day) DO UPDATE SET summary_md = excluded.summary_md, mood = excluded.mood",
                (today_str, full_text, mood)
            )
            success = True
    except Exception as e:
        log.error("Journal chat failed: %s", e)
        
    if not success:
        # Fallback
        fallback = f"Today: {events_summary}. Mood: {mood}. (offline — no reflection)"
        await db.execute(
            "INSERT INTO journal (day, summary_md, mood) VALUES (?, ?, ?) "
            "ON CONFLICT(day) DO UPDATE SET summary_md = excluded.summary_md, mood = excluded.mood",
            (today_str, fallback, mood)
        )
        
    # Append the assistant's message in the session just in case
    await db.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)",
        (session_id, acc if acc else "(fallback)")
    )
        
    # Archive session
    await db.execute("UPDATE sessions SET archived = 1 WHERE id = ?", (session_id,))
    
    if success:
        await db.execute("UPDATE job_runs SET status = 'ok' WHERE id = ?", (run_id,))
        await db.commit()
        await xp.award(db, "job_completed", ref="journal")
    else:
        await db.execute("UPDATE job_runs SET status = 'error', error = 'fallback used' WHERE id = ?", (run_id,))
        await db.commit()

