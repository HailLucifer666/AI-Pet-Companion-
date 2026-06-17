"""Cheap-model gate for heartbeat escalations."""

import json
from dataclasses import dataclass
import datetime
from . import autonomy_state
from ..config import Config

@dataclass(frozen=True)
class GateVerdict:
    act: bool
    reason: str

async def should_act(db, router, config: Config) -> GateVerdict:
    """One cheap-model call to decide if heartbeat should escalate."""
    if not config.proactivity.enabled:
        return GateVerdict(False, "proactivity disabled")
        
    local_now = datetime.datetime.now()
    hour = local_now.hour
    
    start_h = config.proactivity.quiet_start_hour
    end_h = config.proactivity.quiet_end_hour
    if start_h > end_h:
        if hour >= start_h or hour < end_h:
            return GateVerdict(False, "quiet hours")
    else:
        if start_h <= hour < end_h:
            return GateVerdict(False, "quiet hours")
            
    today = local_now.strftime("%Y-%m-%d")
    acts_count = await autonomy_state.acts_today(db, today)
    if acts_count >= config.proactivity.max_proactive_per_day:
        return GateVerdict(False, "daily cap reached")
        
    last_act = await autonomy_state.last_heartbeat_at(db)
    mins_since_act = 0.0
    if last_act:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        if last_act.tzinfo is None:
            last_act = last_act.replace(tzinfo=datetime.timezone.utc)
        mins_since_act = (now_utc - last_act).total_seconds() / 60.0
        if mins_since_act < config.proactivity.min_minutes_between_acts:
            return GateVerdict(False, "min interval not reached")
            
    cur = await db.execute("SELECT mood, energy FROM pet WHERE id = 1")
    pet = await cur.fetchone()
    if not pet:
        return GateVerdict(False, "no pet")
        
    mood = pet["mood"]
    energy = pet["energy"]
    
    cur = await db.execute("SELECT COUNT(*) as c FROM proactive_messages WHERE engaged = 0")
    row = await cur.fetchone()
    unengaged = row["c"] if row else 0
    
    prompt = (
        f"You are the companion's quiet inner sense. It is {local_now.strftime('%H:%M')}. "
        f"You last spoke up {mins_since_act if last_act else 0:.0f} min ago and have spoken {acts_count}/{config.proactivity.max_proactive_per_day} times today. "
        f"Your energy is {energy}/100, mood {mood}. "
        f"Only speak up if you have something genuinely useful or kind to offer right now — never to nag. "
        f"Reply with ONLY JSON: {{\"act\": true|false, \"reason\": \"...\"}}."
    )
    
    role = "background" if "background" in config.roles else "primary"
    
    try:
        messages = [{"role": "system", "content": prompt}]
        # Tools disabled -> pass empty list or whatever router needs.
        # router.chat_stream expects standard kwargs
        stream = router.chat_stream(
            messages=messages,
            role=role,
            tools=[],
            model=None
        )
        acc = ""
        async for chunk in stream:
            acc += chunk.content
            
        start = acc.find("{")
        end = acc.rfind("}")
        if start != -1 and end != -1:
            data = json.loads(acc[start:end+1])
            return GateVerdict(bool(data.get("act", False)), str(data.get("reason", "no reason")))
        else:
            return GateVerdict(False, "json parse failed")
    except Exception as e:
        return GateVerdict(False, f"unreachable or error: {str(e)}")
