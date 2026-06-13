# NeuraClaw — Build Plan v0.3: THE MYCELIUM (W-0 → W-8)

**2026-06-13** · Narrative: [WORLD-BIBLE.md](WORLD-BIBLE.md) · Engineering: [ARCHITECTURE-WORLD.md](ARCHITECTURE-WORLD.md) · Product: [PRD.md](PRD.md)

Checkpoint discipline: **build → verify → commit, never two in flight.** Each checkpoint must leave pytest + vitest green, tsc + ruff clean, bundle within budget, and pass a live browser walk @1280/768 incl. reduced-motion. Commit messages are conventional; suggested ones below.

## Guardrails
See [AGENTS.md](../AGENTS.md). Binding: MIT-only deps (pixi.js MIT ✓) · no AGPL/odysseus source · tokens-only color (TokenBridge) · server-side XP only · zero XP from play · no guilt/decay/nagging · world renders only real data · Synapse payload keys never `type` (use `memory_type`) · WCAG 2.2 AA + static-but-alive reduced-motion + keyboard parity · main ≤300 kB gz, world chunk ≤350 kB gz · 60fps + degrade ladder.

---

## W-0 — Foundations: nervous system + docs ✅ (in progress → done)
- **Synapse + Creature (M-0.2b, `194a78b`):** `core/synapse.py` bus + `sse_stream`; emit hooks in `agent.py`/`store.py`/`reflector.py`; `GET /api/events`; `lib/synapse.ts` subscriber; `state/creatureStore.ts` (pure reducer + priority ladder + decay/sleep timers + `--activity` writer + ref-counted connect); SVG `Creature` (4 stages × states, the permanent ambient rail widget); `/den` stub; styleguide gallery.
- **Startup-cycle fix (`236a923`):** `core/__init__.py` made side-effect-free (the Synapse wiring had introduced an import cycle that crashed `python -m neuraclaw`).
- **Docs (this checkpoint):** WORLD-BIBLE, ARCHITECTURE-WORLD, PRD v2.0, this plan, AGENTS.md, README index.
- **Verified:** pytest **37**, vitest **16**, lint clean, build **207 kB gz**; `POST /api/memory` → `memory.formed` observed live on `/api/events`.
- **Commits:** `feat: Synapse Event Bus + Creature Engine (M-0.2b)` · `fix(core): break startup import cycle` · `docs: world bible, architecture, PRD v2.0, build plan v0.3`

## W-1 — Birth & Growth backend: pet, XP, hatch, ladder (NEXT)
`migrations/004_pet_xp.sql` (pet row + xp_events) · `pet/xp.py` `award()` (PRD §3.3 rates, daily caps, claw-backs; publishes `xp.awarded`/`pet.levelup`/`pet.stage`) · `pet/ladder.py` (capability gates — web_research:2, journal:2, proactive:3, skill_drafting:3, subagents:4, autonomous_jobs:4; config override escape hatch; friendly "not grown enough yet" refusal) · `GET /api/pet` (+brain detection: Ollama probe + key presence) · `POST /api/hatch` (SOUL.md regen, seed memories) · `POST /api/settings/keys` (.env write, never echoed) · `GET /api/den` digest · **Hatch ritual UI v1** (DOM full-screen, 5 questions, brain-check step, suggested first prompts).
**Accept:** wipe `data/` → ritual → pet row + SOUL.md · XP visibly awarded via Synapse · daily-cap unit test · stage-1 `web_search` refused with growth message, override allows.
**Commits:** `feat(hatch)` · `feat(pet): XP engine, growth ladder`

## W-2 — World engine shell: the Grove exists
`npm i pixi.js` · Vite world chunk + `React.lazy(DenView)` · `WorldEngine`+`WorldCanvas` (StrictMode-safe) · Camera + 4-layer parallax + procedural `GroveEnvironment` (moonlight, glow-mushrooms, fireflies on Perlin paths, the Hollow fire, pool) · TokenBridge · FpsDegrader + visibilitychange + WebGL context-loss recovery · reduced-motion static frame.
**Accept:** `/den` = living dark Grove @60fps · main chunk ~207 kB unchanged · world chunk ≤350 kB gz · degrade ladder fires under CPU throttle · reduced-motion = composed still.
**Commit:** `feat(world): PixiJS engine shell, Grove environment, camera+parallax, perf ladder`

## W-3 — The Lumenform lives in it
`LumenformFSM` (pure, tested) · procedural stroke-layer art per stage (`computeDrawSpec` tested) · idle scheduler (wander/tend/nap/play/gaze-at-camera) · storeBridge wires creatureStore events → behavior (walk to Workbench on `tool.start`, plant placeholder crystal on `memory.formed`, home on `done`).
**Accept:** chat from any surface → pet in `/den` walks to the Workbench, works, returns — real events only · reduced-motion: pet IS where state says.
**Commit:** `feat(world): Lumenform — behavior FSM, idle life, event-driven work`

## W-4 — Places & diegetic navigation
Place hotspots (hover brighten + label, focus-visible DOM buttons) · `useSurfaceOverlay` portal transition (camera dolly → Place, world dims/blurs, surface scales in; Esc reverses) · rail keeps the fast path to the same overlays · keyboard map (Tab/Enter/Esc/WASD/Space/M).
**Accept:** click the Hollow → Chat overlay over the living world; a full session is usable diegetically AND via the rail; keyboard-only walkthrough passes.
**Commit:** `feat(world): Places, portal navigation, surfaces as overlay panes`

## W-5 — Living data: crystals, mycelium, weather
`CrystalGenerator` (deterministic, snapshot-tested) · `WorldHydrator` (REST→snapshot→SSE) · Memory Garden renders ALL real memories as 5 crystal species; `memory.formed` → sprout + pet plants; `forgotten` → fold-back · `MyceliumNet` (animated filament network; event pulses travel origin→pet→Gate) · weather/time bindings (local clock, activity-rain, memory-bloom, quiet-hours sleep) · Spore Gate visible with XP fill.
**Accept:** 10 memories in DB → 10 identical-every-launch crystals · delete in the Memory surface → the crystal folds in `/den` · pulses on tool runs · gate fill = real XP.
**Commit:** `feat(world): memory crystals, Mycelium pulses, diegetic weather+time`

## W-6 — Cinematics & HUD: the moments
`CinematicDirector` (queue, skippable, reduced-motion stills) · **The Quickening** (hatch ritual moves in-world) · **The Blooming** (level-up) · **The Forging** (`skill.drafted` at the Foundry) · HUD: the Coil XP ring (ticks on `xp.awarded`), stage name, Sky-read glyph, days-alive; auto-hide on pan · daily greeting (real digest bubble via useWorldAnchor).
**Accept:** fresh install → Quickening end-to-end → directed first prompts · cross 250 XP → Blooming + ring · every cinematic has a still fallback.
**Commits:** `feat(world): cinematic director, the Quickening` · `feat(world): the Coil HUD, Blooming, Forging, daily greeting`

## W-7 — The Widening: realms II & III
`realmData` for Wilderness + Observatory (camera bounds expand) · **The Widening** cinematic on `pet.stage` (gate blooms, pet densifies, camera reveal) · Wilderness (token rivers, light-trees, Foundry, Crystal Fields) · Observatory (starfield, aurora=XP velocity, Orrery=jobs, world-map Long View) · locked gates render as "it will grow into this."
**Accept:** stage=3 in DB → Widening plays → Wilderness reachable, Grove still standing · stage=4 → Observatory · gates lock correctly below threshold.
**Commit:** `feat(world): the Widening — Digital Wilderness + Observatory realms`

## W-8 — Full-game layer
Diegetic chat at the Hollow/Hearthstone (speech bubbles anchored to the pet, streaming caret in-bubble; the Chat surface stays the power path) · clickable crystals open the REAL memory (`memory_id` already in payload) · approved skills become placeable Foundry monuments (the only earned decoration) · walk-to mode · fetch minigame · proactive check-ins as world events (rides the v0.3 heartbeat) · subagent Lumenforms at the Council Table (Elder) · optional ambient soundscape (OFF by default).
**Accept:** a full conversation conducted entirely in-world · crystal click shows real memory text · charm-never-blocks audit: every feature ignorable, zero XP from play.
**Commits:** `feat(world): diegetic chat` · `feat(world): living memories, monuments, play`

## Beyond (world-framed)
Scheduler/journal/palette (v0.3 → journal readable at the Reading Root) · Telegram + approvals (v0.4 → approval = pet presenting a request bubble) · Documents/Tasks/Calendar/Research/Email surfaces (v0.5/0.6 → their Places already exist in realms II/III) · MCP client.

## Final "trailer test"
Fresh machine → INSTALL → START → The Quickening births world + pet → first directed chat → pet walks to the Workbench as a real tool runs → a memory crystal sprouts and is planted → XP motes flow to the Spore Gate → 60s screen-record. If the clip doesn't make someone ask "what IS that app?", iterate before shipping.
