# Autonomy — Phase 1 Build Plan

**Path B — Mission Phase 1: "Proactivity & grows-with-you."**
Build-ready. Antigravity executes this verbatim. Targets, in locked order:

1. **Async scheduler** — harden the existing loop (persist, idempotent, gated).
2. **Hourly heartbeat — gated by a cheap model** (decision gate; escalate to smart only on a yes).
3. **Nightly journal** — a NOW.md-style scratchpad: stored, guaranteed, fed back into tomorrow's context.
4. **Finish MOOD/energy** — backend source of truth → reaches the world via Synapse → worldStore.

> **Anchor reality (verified against the repo):** `core/scheduler.py` already runs a 60s `run_loop` spawned in `api/app.py:35`. `core/agent.run_turn` is reused as-is by the scheduler and publishes `agent.*` Synapse events. `pet/xp.py` is the server-side XP engine (`pet` row singleton id=1, `mood TEXT DEFAULT 'content'` column **read but never written**). `migrations/003` defines `jobs`/`job_runs` (**zero Python readers/writers**). `XP_RATES` defines `job_completed` (5) and `proactive_useful` (15) — **never awarded**. Latest migration is `007_documents.sql`, so new migrations are **008+**. `context.build_system_prompt(db, query)` injects SOUL + profile + memories + skills — **no journal, no mood**.

**DO NOT rewrite `core/scheduler.py` or `core/agent.run_turn`.** Both work. We *extend* the scheduler (new helpers, gating, persistence) and *thread* new state through existing seams (Synapse event names, `xp.award`, `build_system_prompt`, worldStore SSE switch).

---

## 0. Config additions (config.yaml + config.py)

### 0.1 New `background` role (the cheap gate's model)

`config.yaml` `roles:` — add a `background` chain that prefers local/free, never primary:

```yaml
roles:
  primary:
    - nim/meta/llama-3.1-8b-instruct
    - nim/meta/llama-3.3-70b-instruct
    - ollama/qwen3.5:latest
  cheap:
    - nim/meta/llama-3.1-8b-instruct
    - ollama/qwen3:8b
  background:            # NEW — the heartbeat decision-gate model
    - ollama/qwen3:8b    # local-first: zero credit cost when Ollama is up
    - nim/meta/llama-3.1-8b-instruct
  local:
    - ollama/qwen3.5:latest
    - ollama/qwen3:8b
```

Today `_run_heartbeat` does `role = "background" if "background" in config.roles else "primary"` — it falls to `primary` because `background` is absent. Adding the role flips it to cheap automatically; no scheduler change needed for the fallback line itself.

### 0.2 New `ProactivityConfig` (config.py)

Add a frozen-style pydantic model + field on `Config`:

```python
class ProactivityConfig(BaseModel):
    enabled: bool = True
    # Local clock hours [start, end) during which NO heartbeat fires (quiet hours).
    quiet_start_hour: int = Field(default=22, ge=0, le=23)
    quiet_end_hour: int = Field(default=8, ge=0, le=23)   # wraps midnight if start>end
    # Hard ceiling on heartbeats that ESCALATE to an act (per local day).
    max_proactive_per_day: int = Field(default=6, ge=0, le=48)
    # Minimum minutes between two escalated (acted) heartbeats.
    min_minutes_between_acts: int = Field(default=45, ge=0, le=1440)
    # Nightly journal local hour:minute.
    journal_hour: int = Field(default=23, ge=0, le=23)
    journal_minute: int = Field(default=50, ge=0, le=59)

class Config(BaseModel):
    ...
    pet: PetConfig = Field(default_factory=PetConfig)
    proactivity: ProactivityConfig = Field(default_factory=ProactivityConfig)  # NEW
```

`config.yaml` gets an optional `proactivity:` block (all defaults above are sane; the block is optional). **No secrets.** Quiet hours default 22:00–08:00 — fixes the "runs at 3am" gap.

---

## 1. Target 1 — Async scheduler (current → target)

### Current
Single `run_loop`, 60s tick, two **in-memory** cursors (`last_heartbeat_hour`, `last_journal_day`). On restart the cursors re-arm from "now," so a window can be **skipped or double-run**. Heartbeat fire-and-forgets a full turn every hour with no gate, no quiet hours, no rate limit.

### Target
Same loop shape and 60s tick — but:
- **Persisted run cursors** (survive sidecar restart → idempotent).
- A **gate** before every heartbeat (quiet hours + rate limit + cheap-model decision; see Target 2).
- Every heartbeat/journal recorded into `job_runs` (the Den "what I did while away" digest reads this).
- Offline-safe: provider failure → `job_runs.status='error'`, swallowed, loop continues.

### 1.1 Data model — migration `008_autonomy.sql`

```sql
-- 008: autonomy run-state, journal, proactive utterances, pet energy.

-- Durable scheduler cursors so a sidecar restart can't skip/double-run a window.
-- Singleton-ish key/value of ISO timestamps + counters. One row per logical clock.
CREATE TABLE autonomy_state (
    key   TEXT PRIMARY KEY,          -- 'last_heartbeat_at' | 'last_journal_day' | 'acts_today_date' | 'acts_today_count'
    value TEXT NOT NULL DEFAULT ''
);

-- First-person nightly journal entries (the NOW.md scratchpad, versioned by day).
CREATE TABLE journal (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    day         TEXT NOT NULL,                       -- local date 'YYYY-MM-DD' (UNIQUE: one canonical entry/day)
    summary_md  TEXT NOT NULL DEFAULT '',            -- the "NOW" scratchpad body (first-person)
    mood        TEXT NOT NULL DEFAULT 'content',     -- mood at journal time
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_journal_day ON journal(day);

-- Proactive utterances the companion produced on its own (heartbeat escalations).
-- Gives proactive output a HOME and an engagement signal for proactive_useful XP.
CREATE TABLE proactive_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL,                       -- the session the utterance lives in (visible surface)
    text        TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'heartbeat',   -- 'heartbeat' | 'journal'
    engaged     INTEGER NOT NULL DEFAULT 0,          -- user acknowledged/replied -> 1 (awards proactive_useful)
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_proactive_unengaged ON proactive_messages(engaged) WHERE engaged = 0;

-- Server-side energy for the pet (0..100). Single column on the singleton row.
ALTER TABLE pet ADD COLUMN energy INTEGER NOT NULL DEFAULT 80 CHECK (energy BETWEEN 0 AND 100);
```

> We **reuse** the existing `jobs`/`job_runs` tables for run logging (no new run table). Heartbeat and journal each get a **synthetic system job** row inserted once (idempotent `INSERT OR IGNORE` by `name`), and every fire writes a `job_runs` row. `jobs.type` CHECK already permits `'heartbeat'`; the journal job uses `type='agent_task'`.

### 1.2 New module `core/autonomy_state.py` (run-cursor repository)

Pure async helpers over `autonomy_state` — keeps `scheduler.py` thin and immutable-friendly:

```python
async def get(db, key: str) -> str | None
async def set(db, key: str, value: str) -> None          # UPSERT
async def last_heartbeat_at(db) -> datetime | None
async def record_heartbeat(db, when: datetime) -> None
async def last_journal_day(db) -> str | None             # 'YYYY-MM-DD'
async def record_journal_day(db, day: str) -> None
async def acts_today(db, today: str) -> int              # resets count when stored date != today
async def bump_acts_today(db, today: str) -> None
```

### 1.3 Scheduler changes (`core/scheduler.py` — EXTEND)

- `run_loop`: on entry, **hydrate cursors from `autonomy_state`** instead of `-1`. Compute "is a heartbeat due" as `now - last_heartbeat_at >= ~55min` (clock-rollover OR catch-up after restart) rather than bare `hour != last_hour`.
- Before firing a heartbeat call the **gate** (Target 2). Only fire `_run_heartbeat` when the gate returns `act=True`.
- `_run_heartbeat` / `_run_journal`: wrap each in a `job_runs` lifecycle (`running` → `ok`/`error`/`skipped`) and persist the cursor **after** the attempt.
- Keep the 60s `asyncio.sleep`. Keep `asyncio.create_task` fire-and-forget. Keep `try/except log` swallow.

### Sidecar / async-runtime concern
Scheduler is an asyncio task in the FastAPI lifespan (`app.py:35`), packaged in the PyInstaller sidecar under Tauri; it lives/dies with the backend. Persisted cursors (1.1) make restart safe. **DB contention:** background turns share the single `aiosqlite` connection on `app.state.db` with live chat (SQLite WAL serializes writes) — keep heartbeat/journal writes short and let `run_turn`'s existing per-step commits interleave. Do **not** open a second connection.

### Offline behavior
If no provider is reachable, the cheap gate (Target 2) cannot get a decision → it returns `act=False` (fail-closed: stay quiet, cost nothing) and writes `job_runs.status='skipped'`. The journal write is **guaranteed** even offline (see Target 3 fallback). The loop never crashes.

### Visible change
Each escalated heartbeat still publishes the existing `agent.thinking` / `agent.tool.*` / `agent.done` events, so the world reacts exactly as it does for live chat. New: a `pet.mood` event (Target 4) and a `proactive.message` event (Target 2) so surfaces can show what the pet did while away.

---

## 2. Target 2 — Hourly heartbeat GATED BY A CHEAP MODEL

### The gate (two-stage)
Replace the current "always spend a turn" behavior with **rest → maybe act**:

```
heartbeat tick
  ├─ (a) HARD GUARDS (no model spend):
  │       proactivity.enabled? in quiet hours? acts_today >= max_proactive_per_day?
  │       minutes since last act < min_minutes_between_acts?
  │       → if any fails: status='skipped', return (cost 0)
  ├─ (b) CHEAP DECISION (role="background", NO tools, ~1 cheap call):
  │       send a compact gate prompt; parse a strict JSON verdict
  │       {"act": bool, "reason": str}
  │       → if act=false: status='ok' (rested), return (cost ~1 cheap call)
  └─ (c) ESCALATE (act=true): run a fuller turn
          role="primary" WITH tools (the existing run_turn, unchanged)
          persist a proactive_messages row from the final text
          award proactive_useful is DEFERRED until the user engages (see 2.4)
          bump acts_today; record_heartbeat
```

### 2.1 New module `core/gate.py`
```python
@dataclass(frozen=True)
class GateVerdict:
    act: bool
    reason: str

async def should_act(db, router, config) -> GateVerdict:
    """One cheap-model call. Builds a tiny context (time of day, last act time,
    a 1-line mood/energy summary, count of unengaged proactive messages) and asks
    the background-role model to answer ONLY with JSON {"act":bool,"reason":str}.
    No tools. Fail-closed: any provider/parse error -> GateVerdict(False, 'unreachable')."""
```

Gate prompt (system + user), kept under ~300 tokens — the cost guardrail:
> "You are the companion's quiet inner sense. It is {local_time}. You last spoke up {mins} min ago and have spoken {n}/{max} times today. Your energy is {energy}/100, mood {mood}. Only speak up if you have something genuinely useful or kind to offer right now — never to nag. Reply with ONLY JSON: {\"act\": true|false, \"reason\": \"...\"}."

### Cost guardrails (explicit)
- **Stage (a) costs nothing** — pure code (quiet hours, daily cap, min-interval). Most ticks die here.
- **Stage (b)** is one `role="background"` call (Ollama-first → free when local up; NIM `llama-3.1-8b` otherwise), **tools disabled**, output capped (`{"act":bool}`), so it cannot loop.
- **Stage (c)** — the only `primary` spend — fires **at most `max_proactive_per_day` (default 6)** times/day, never inside quiet hours, never within `min_minutes_between_acts`. Today's "full primary turn every hour, 24×/day" becomes "≤6 cheap gates that pass, capped, quiet-hours-respecting."
- OpenRouter low-credit (402) never enters these chains; failover lands on NIM/Ollama. Per MEMORY this is the safe path.

### When does it escalate to the smart model?
Only when **(a)** all hard guards pass **and (b)** the background model returns `act=true`. The escalation uses `role="primary"` (the smart chain) with tools so it can actually `remember`, `create_note`, `search_memory`, etc. — i.e., produce a *useful* proactive action, not just chatter.

### 2.2 Where proactive output goes
Heartbeat escalations write into the existing `internal_monologue` session (already created by `_run_heartbeat`) **and** insert a `proactive_messages` row with the final assistant text. The `internal_monologue` session is **not** archived, so it's a browsable surface ("what my pet thought about while I was away"). Publish:
```
synapse.publish("proactive.message", id=<row id>, kind="heartbeat", text=<final[:280]>)
```

### 2.3 Endpoints (api/routes.py — new `# ── Autonomy ──` block)
```
GET  /api/proactive            -> {"messages": [ ...recent proactive_messages... ]}  (latest 30)
POST /api/proactive/{id}/engage-> mark engaged=1; if it flips 0->1, award proactive_useful; return {"ok":true}
GET  /api/jobs/runs            -> {"runs": [ ...recent job_runs join jobs.name... ]}  (Den "while away" digest)
GET  /api/journal              -> {"entries": [ ...last 7 journal rows... ]}          (Target 3)
GET  /api/autonomy             -> {"enabled":bool,"acts_today":int,"max":int,"quiet":bool,"last_heartbeat_at":...}
```
Follow the existing route style (`request.app.state.db`, plain dict returns, `HTTPException` on 404).

### 2.4 XP wiring (finally award the defined-but-unused rates)
- **`job_completed`** (5): in `_run_heartbeat`/`_run_journal`, on `job_runs.status='ok'`, call `await xp.award(db, "job_completed", ref="heartbeat")`. (Cap 40/day already exists — well above 6 acts.)
- **`proactive_useful`** (15): awarded **only** when the user engages via `POST /api/proactive/{id}/engage` (the engagement signal the PRD's ">=50% engaged" needs). Never auto-awarded.

### Offline behavior
Gate fail-closed → no escalation, `status='skipped'`, zero spend. The pet simply rests; the world shows idle cadence (existing `tickIdle`).

### Visible change
On escalation: the existing `agent.thinking`/tool/`done` pulses animate the village in real time; the new `proactive.message` event lets a HUD/toast surface the utterance; engaging it later triggers `xp.awarded` (bloom).

---

## 3. Target 3 — Nightly journal (NOW.md-style scratchpad)

### What it is
Once per local day (default 23:50) the companion writes a **first-person "NOW" scratchpad**: what happened today, what it's curious about, what it plans for tomorrow. This is the "grows with you" memory thread — **guaranteed stored**, and **injected into tomorrow's context**.

### Where stored
The new **`journal` table** (1.1), one canonical row per `day` (UNIQUE index → re-run upserts, no dupes). This replaces today's behavior where `_run_journal` merely *asks the model to maybe call `create_note`* (relies on voluntary tool use — unreliable). We **guarantee the write** ourselves.

### What it summarizes (the build prompt for `_run_journal`)
Feed the model a compact day digest (assembled by code, not left to tool calls):
- today's `xp_events` grouped by type (work done),
- count of memories formed today,
- recent `internal_monologue` highlights (heartbeat acts) + last user session titles,
- current `mood` + `energy`.

Prompt asks for **two outputs in one JSON**: `{"summary_md": "<first-person NOW scratchpad>", "tomorrow": "<one intention>"}`. Code writes `summary_md` (+ appended `tomorrow`) into `journal` for today's date.

### Guaranteed write + fallback
- On model success: upsert `journal(day, summary_md, mood)`.
- On model/provider failure (offline): still upsert a **deterministic fallback** `summary_md` built from the code digest ("Today: 3 tools, 2 memories, mood content. (offline — no reflection)"). The journal is **never empty** for a day the sidecar was alive at 23:50.
- Record `job_runs` (`ok`/`error`) and award `job_completed` on ok.
- Keep the existing session-archive behavior for the journal session.

### How it feeds memory + the next day
**Inject the last 3 journal entries into the system prompt** — the missing piece in `context.build_system_prompt`. Add, right after the Memories block:

```python
# context.build_system_prompt(...)
cur = await db.execute(
    "SELECT day, summary_md FROM journal ORDER BY day DESC LIMIT 3"
)
recent = await cur.fetchall()
if recent:
    parts.append(
        "## Recent journal (your NOW scratchpad)\n"
        + "\n".join(f"### {r['day']}\n{r['summary_md']}" for r in recent)
    )
```

This makes every subsequent turn — chat *and* heartbeat — start with continuity ("yesterday I...", "I planned to..."). That is the literal "grows with you" loop.

### Endpoint
`GET /api/journal` (2.3) surfaces the entries for the Den. Optionally a `den` digest field `last_journal` can read `journal ORDER BY day DESC LIMIT 1`.

### Sidecar / offline / visible
Same lifespan task; cursor `last_journal_day` persisted so a restart near 23:50 won't double-write (UNIQUE index also protects). Offline → fallback entry. Visible: journal turn publishes `agent.*` (village reacts), and the Den shows the latest NOW entry.

---

## 4. Target 4 — Finish MOOD / energy (backend source of truth → the world)

### The gap
`pet.mood` is **read** (`get_pet`) but **never written**. The frontend invents its own visual mood (`moodWord(emotion)` from pulse cadence) — disconnected from real pet state. `energy` lived only in the frontend FSM. We give both a **server home** and a one-way path to the world.

### Backend source of truth
- **`pet.energy`** column (1.1, 0..100, default 80).
- **New module `pet/mood.py`** — pure derivation, no model call:

```python
# pet/mood.py
MOODS = ("radiant", "content", "curious", "drowsy")  # PRD §3.5

def derive_mood(*, energy: int, hour: int, mins_since_work: float,
                xp_today: int, idle_days: int) -> str:
    """Deterministic. radiant: high energy + recent work; curious: recent work, lower energy;
       drowsy: quiet hours OR low energy OR idle_days>=1; else content."""

async def recompute(db) -> dict:
    """Read pet + today's xp_events + last_seen → derive energy delta and mood.
       Energy: drains slowly with time-since-work, recovers in quiet hours (rest),
       clamped 0..100. Writes pet.energy + pet.mood ONLY when changed, then publishes."""
```

### When it runs (no new loop)
`mood.recompute(db)` is called:
1. at the **end of every heartbeat tick** (escalated *or* rested — cheap, no model), and
2. once at **scheduler startup**, and
3. after the **nightly journal** writes (mood captured into the journal row).

Energy model (simple, server-side): `tool_ok`/`conversation`/`memory_formed` today raise energy; long idle + quiet hours lower it; clamp 0..100. This replaces the frontend-only `LumenformFSM.energy` as the **authority** (the FSM keeps its visual float but is *seeded/corrected* by the server value).

### How it reaches the world
On change, publish a **new Synapse event** (payload key rule: never use `type`):
```python
synapse.publish("pet.mood", mood=<str>, energy=<int>)
```
SSE already serializes any event type, so no synapse/route change is needed beyond publishing.

### Frontend wiring (worldStore.ts — EXTEND the SSE switch in `connect()`)
Add a handler alongside the existing ones:
```ts
if (ev.type === "pet.mood") {
  store.setPetMood(String(ev.mood || "content"), Number(ev.energy ?? 80));
  return;
}
```
Add store state + setter:
```ts
petMood: string;        // server-authoritative mood word
petEnergy: number;      // 0..100 server energy
setPetMood: (mood: string, energy: number) => void;
```
`setPetMood` stores both and biases the visual layer: feed `petEnergy/100` into the LumenformFSM energy seed and let `petMood` override the HUD `mood` string (server truth wins over `moodWord(emotion)` when present; fall back to derived when no server event yet). `hydrate()` also reads `petRes.pet.mood`/`.energy` so the world is correct on first paint (the `/api/pet` response already returns `mood`; add `energy` once the column exists — `get_pet` SELECT must add `energy`).

> **`pet/xp.py get_pet` change:** add `energy` to the SELECT column list so `/api/pet` and `/api/den` expose it. (One-line edit.)

### Offline / sidecar / visible
- Offline: `recompute` is pure (no provider) → mood/energy still update every tick even with zero model access. This is the **local-first degrade** — the pet still visibly breathes (radiant→drowsy by clock/energy) with no network.
- Sidecar: runs inside the existing scheduler task; energy persists in the DB across restart.
- Visible: the creature's glow/HUD now reflects *real* pet state — e.g. drowsy + dimmed in quiet hours, radiant after a productive burst — instead of a purely cosmetic cadence read.

---

## 5. Ordered build checklist (files touched)

> Each step is independently shippable; later steps depend on earlier data shapes.

1. **`migrations/008_autonomy.sql`** — `autonomy_state`, `journal`, `proactive_messages`, `pet.energy` column. (Migrator auto-applies on next boot; 008 > 007.)
2. **`config.py`** — add `ProactivityConfig` + `Config.proactivity`. **`config.yaml`** — add `roles.background` chain + optional `proactivity:` block.
3. **`core/autonomy_state.py`** *(new)* — cursor repository (get/set, heartbeat/journal cursors, acts-today counter).
4. **`pet/mood.py`** *(new)* — `MOODS`, `derive_mood`, `recompute` (writes `pet.energy`/`pet.mood`, publishes `pet.mood`).
5. **`pet/xp.py`** — add `energy` to `get_pet` SELECT (one line). (XP awards for `job_completed`/`proactive_useful` are *called from* steps 6 & 8.)
6. **`core/gate.py`** *(new)* — `GateVerdict`, `should_act` (hard guards + cheap-model `role="background"`, tools off, fail-closed JSON parse).
7. **`core/scheduler.py`** *(extend)* — hydrate cursors from `autonomy_state`; call `gate.should_act` before heartbeat; `_run_heartbeat`/`_run_journal` wrapped in `job_runs` lifecycle; ensure synthetic `jobs` rows (`INSERT OR IGNORE`); award `job_completed` on ok; write `proactive_messages` + publish `proactive.message`; call `mood.recompute` each tick; guaranteed journal write into `journal` (+ offline fallback).
8. **`core/context.py`** *(extend)* — inject last 3 `journal` rows into `build_system_prompt`.
9. **`api/routes.py`** *(extend)* — `# ── Autonomy ──`: `GET /api/proactive`, `POST /api/proactive/{id}/engage` (awards `proactive_useful`), `GET /api/jobs/runs`, `GET /api/journal`, `GET /api/autonomy`. Optional: add `energy`/`last_journal` to `GET /api/den`.
10. **`frontend/src/lib/api.ts`** *(extend)* — typed client methods for the five new endpoints; extend the `pet()` type with `energy`.
11. **`frontend/src/state/worldStore.ts`** *(extend)* — add `petMood`/`petEnergy`/`setPetMood`; handle `"pet.mood"` in the `connect()` SSE switch; read `mood`/`energy` in `hydrate()`; bias FSM energy seed + HUD mood from server truth.
12. **Tests** (`backend/tests/`, pytest): `test_gate.py` (hard guards + fail-closed), `test_mood.py` (deterministic derivation), `test_scheduler_idempotent.py` (restart doesn't double-run via persisted cursor), `test_journal.py` (guaranteed write + offline fallback + UNIQUE-day upsert), `test_proactive_engage_xp.py` (engage flips 0→1 once, awards once). Target ≥80% on new modules.

---

## 6. Explicitly OUT of scope (Phase 1)

- **OS cron / external scheduler / `CronCreate`** — the asyncio lifespan loop stays the only scheduler. No persistence of "next fire" beyond the cursor.
- **Driving the scheduler off `jobs.cron_expr`** (user-defined cron jobs / job CRUD UI) — we only *reuse* `jobs`/`job_runs` for run logging. General cron is a later phase.
- **Tauri native notifications / push / toasts / push-to-talk** — Phase 4. Proactive output lands in the `internal_monologue` session + `proactive_messages` table + `proactive.message` event; surfacing it as an OS notification is deferred.
- **Telegram / remote channels** (`jobs.channel_target`) — later phase.
- **MCP-driven autonomy** — out; MCP exists but is not wired into the heartbeat decision.
- **Deeper memory / journal embeddings / semantic recall of journals** — journals are injected as the last-3 raw text only; no vectorization this phase.
- **Realm II/III design** (Outer Ruins / High Keep connectivity) — unrelated to autonomy; not touched here.
- **Replacing the frontend `LumenformFSM`/`deriveEmotion`** — kept; server mood/energy *biases* it, does not delete it.
- **Multi-pet / multi-user** — single-user local app, `pet` stays singleton id=1.
- **Smart-model journaling cost optimization** (cheap-model journal) — journal uses `primary` for quality once/day; gating it is a future tuning, not Phase 1.
