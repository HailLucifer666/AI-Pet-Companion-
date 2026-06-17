"""Derive and publish pet mood and energy."""

import datetime
from ..core.synapse import synapse

MOODS = ("radiant", "content", "curious", "drowsy")

def derive_mood(*, energy: int, hour: int, mins_since_work: float,
                xp_today: int, idle_days: int) -> str:
    """Deterministic. radiant: high energy + recent work; curious: recent work, lower energy;
       drowsy: quiet hours OR low energy OR idle_days>=1; else content."""
    quiet_hours = (hour >= 22 or hour < 8)
    if quiet_hours or energy < 30 or idle_days >= 1:
        return "drowsy"
    if xp_today > 0 and energy > 60:
        return "radiant"
    if xp_today > 0 and energy <= 60:
        return "curious"
    return "content"

async def recompute(db) -> dict:
    """Read pet + today's xp_events + last_seen -> derive energy delta and mood.
       Energy: drains slowly with time-since-work, recovers in quiet hours (rest),
       clamped 0..100. Writes pet.energy + pet.mood ONLY when changed, then publishes."""
    
    cur = await db.execute("SELECT id, energy, mood FROM pet WHERE id = 1")
    pet = await cur.fetchone()
    if not pet:
        return {}

    current_energy = pet["energy"]
    current_mood = pet["mood"]
    
    now = datetime.datetime.now(datetime.timezone.utc)
    local_now = datetime.datetime.now()
    today_prefix = now.strftime("%Y-%m-%d")
    
    cur = await db.execute(
        "SELECT COUNT(*) as c, MAX(created_at) as last_work FROM xp_events WHERE created_at LIKE ?",
        (f"{today_prefix}%",)
    )
    xp_row = await cur.fetchone()
    xp_today = xp_row["c"] if xp_row else 0
    
    mins_since_work = 0.0
    idle_days = 0
    if xp_row and xp_row["last_work"]:
        try:
            last_work_dt = datetime.datetime.fromisoformat(xp_row["last_work"].replace("Z", "+00:00"))
            mins_since_work = (now - last_work_dt).total_seconds() / 60.0
        except ValueError:
            pass
    else:
        idle_days = 1
        mins_since_work = 1440.0
        
    # Determine new energy
    new_energy = current_energy
    hour = local_now.hour
    
    if hour >= 22 or hour < 8:
        # quiet hours: recover
        new_energy = min(100, current_energy + 1)
    else:
        if mins_since_work < 60:
            # recent work: raise energy
            new_energy = min(100, current_energy + 2)
        else:
            # idle: drain
            new_energy = max(0, current_energy - 1)
            
    # Calculate mood
    new_mood = derive_mood(
        energy=new_energy,
        hour=hour,
        mins_since_work=mins_since_work,
        xp_today=xp_today,
        idle_days=idle_days
    )
    
    if new_energy != current_energy or new_mood != current_mood:
        await db.execute(
            "UPDATE pet SET energy = ?, mood = ? WHERE id = 1",
            (new_energy, new_mood)
        )
        await db.commit()
        synapse.publish("pet.mood", mood=new_mood, energy=new_energy)
        
    return {"energy": new_energy, "mood": new_mood}
