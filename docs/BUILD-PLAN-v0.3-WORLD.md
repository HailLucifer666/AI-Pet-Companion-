# AI Pet Companion â€” Build Plan v0.3: THE MYCELIUM (W-0 â†’ W-8)

**2026-06-13** Â· Narrative: [WORLD-BIBLE.md](WORLD-BIBLE.md) Â· Engineering: [ARCHITECTURE-WORLD.md](ARCHITECTURE-WORLD.md) Â· Product: [PRD.md](PRD.md)

Checkpoint discipline: **build â†’ verify â†’ commit, never two in flight.** Each checkpoint must leave pytest + vitest green, tsc + ruff clean, bundle within budget, and pass a live browser walk @1280/768 incl. reduced-motion. Commit messages are conventional; suggested ones below.

## Guardrails
See [AGENTS.md](../AGENTS.md). Binding: MIT-only deps (pixi.js MIT âœ“) Â· no AGPL/odysseus source Â· tokens-only color (TokenBridge) Â· server-side XP only Â· zero XP from play Â· no guilt/decay/nagging Â· world renders only real data Â· Synapse payload keys never `type` (use `memory_type`) Â· WCAG 2.2 AA + static-but-alive reduced-motion + keyboard parity Â· main â‰¤300 kB gz, world chunk â‰¤350 kB gz Â· 60fps + degrade ladder.

---

## W-0 â€” Foundations: nervous system + docs âœ… (in progress â†’ done)
- **Synapse + Creature (M-0.2b, `194a78b`):** `core/synapse.py` bus + `sse_stream`; emit hooks in `agent.py`/`store.py`/`reflector.py`; `GET /api/events`; `lib/synapse.ts` subscriber; `state/creatureStore.ts` (pure reducer + priority ladder + decay/sleep timers + `--activity` writer + ref-counted connect); SVG `Creature` (4 stages Ã— states, the permanent ambient rail widget); `/den` stub; styleguide gallery.
- **Startup-cycle fix (`236a923`):** `core/__init__.py` made side-effect-free (the Synapse wiring had introduced an import cycle that crashed `python -m AI Pet Companion`).
- **Docs (this checkpoint):** WORLD-BIBLE, ARCHITECTURE-WORLD, PRD v2.0, this plan, AGENTS.md, README index.
- **Verified:** pytest **37**, vitest **16**, lint clean, build **207 kB gz**; `POST /api/memory` â†’ `memory.formed` observed live on `/api/events`.
- **Commits:** `feat: Synapse Event Bus + Creature Engine (M-0.2b)` Â· `fix(core): break startup import cycle` Â· `docs: world bible, architecture, PRD v2.0, build plan v0.3`

## W-1 â€” Birth & Growth backend: pet, XP, hatch, ladder (NEXT)
`migrations/004_pet_xp.sql` (pet row + xp_events) Â· `pet/xp.py` `award()` (PRD Â§3.3 rates, daily caps, claw-backs; publishes `xp.awarded`/`pet.levelup`/`pet.stage`) Â· `pet/ladder.py` (capability gates â€” web_research:2, journal:2, proactive:3, skill_drafting:3, subagents:4, autonomous_jobs:4; config override escape hatch; friendly "not grown enough yet" refusal) Â· `GET /api/pet` (+brain detection: Ollama probe + key presence) Â· `POST /api/hatch` (SOUL.md regen, seed memories) Â· `POST /api/settings/keys` (.env write, never echoed) Â· `GET /api/den` digest Â· **Hatch ritual UI v1** (DOM full-screen, 5 questions, brain-check step, suggested first prompts).
**Accept:** wipe `data/` â†’ ritual â†’ pet row + SOUL.md Â· XP visibly awarded via Synapse Â· daily-cap unit test Â· stage-1 `web_search` refused with growth message, override allows.
**Commits:** `feat(hatch)` Â· `feat(pet): XP engine, growth ladder`

## W-2 â€” World engine shell: the Grove exists
`npm i pixi.js` Â· Vite world chunk + `React.lazy(DenView)` Â· `WorldEngine`+`WorldCanvas` (StrictMode-safe) Â· Camera + 4-layer parallax + procedural `GroveEnvironment` (moonlight, glow-mushrooms, fireflies on Perlin paths, the Hollow fire, pool) Â· TokenBridge Â· FpsDegrader + visibilitychange + WebGL context-loss recovery Â· reduced-motion static frame.
**Accept:** `/den` = living dark Grove @60fps Â· main chunk ~207 kB unchanged Â· world chunk â‰¤350 kB gz Â· degrade ladder fires under CPU throttle Â· reduced-motion = composed still.
**Commit:** `feat(world): PixiJS engine shell, Grove environment, camera+parallax, perf ladder`

## W-3 â€” The Lumenform lives in it
`LumenformFSM` (pure, tested) Â· procedural stroke-layer art per stage (`computeDrawSpec` tested) Â· idle scheduler (wander/tend/nap/play/gaze-at-camera) Â· storeBridge wires creatureStore events â†’ behavior (walk to Workbench on `tool.start`, plant placeholder crystal on `memory.formed`, home on `done`).
**Accept:** chat from any surface â†’ pet in `/den` walks to the Workbench, works, returns â€” real events only Â· reduced-motion: pet IS where state says.
**Commit:** `feat(world): Lumenform â€” behavior FSM, idle life, event-driven work`

## W-4 â€” Places & diegetic navigation
Place hotspots (hover brighten + label, focus-visible DOM buttons) Â· `useSurfaceOverlay` portal transition (camera dolly â†’ Place, world dims/blurs, surface scales in; Esc reverses) Â· rail keeps the fast path to the same overlays Â· keyboard map (Tab/Enter/Esc/WASD/Space/M).
**Accept:** click the Hollow â†’ Chat overlay over the living world; a full session is usable diegetically AND via the rail; keyboard-only walkthrough passes.
**Commit:** `feat(world): Places, portal navigation, surfaces as overlay panes`

## W-5 â€” Living data: crystals, mycelium, weather
`CrystalGenerator` (deterministic, snapshot-tested) Â· `WorldHydrator` (RESTâ†’snapshotâ†’SSE) Â· Memory Garden renders ALL real memories as 5 crystal species; `memory.formed` â†’ sprout + pet plants; `forgotten` â†’ fold-back Â· `MyceliumNet` (animated filament network; event pulses travel originâ†’petâ†’Gate) Â· weather/time bindings (local clock, activity-rain, memory-bloom, quiet-hours sleep) Â· Spore Gate visible with XP fill.
**Accept:** 10 memories in DB â†’ 10 identical-every-launch crystals Â· delete in the Memory surface â†’ the crystal folds in `/den` Â· pulses on tool runs Â· gate fill = real XP.
**Commit:** `feat(world): memory crystals, Mycelium pulses, diegetic weather+time`

## W-6 â€” Cinematics & HUD: the moments
`CinematicDirector` (queue, skippable, reduced-motion stills) Â· **The Quickening** (hatch ritual moves in-world) Â· **The Blooming** (level-up) Â· **The Forging** (`skill.drafted` at the Foundry) Â· HUD: the Coil XP ring (ticks on `xp.awarded`), stage name, Sky-read glyph, days-alive; auto-hide on pan Â· daily greeting (real digest bubble via useWorldAnchor).
**Accept:** fresh install â†’ Quickening end-to-end â†’ directed first prompts Â· cross 250 XP â†’ Blooming + ring Â· every cinematic has a still fallback.
**Commits:** `feat(world): cinematic director, the Quickening` Â· `feat(world): the Coil HUD, Blooming, Forging, daily greeting`

## W-7 â€” The Widening: realms II & III
`realmData` for Wilderness + Observatory (camera bounds expand) Â· **The Widening** cinematic on `pet.stage` (gate blooms, pet densifies, camera reveal) Â· Wilderness (token rivers, light-trees, Foundry, Crystal Fields) Â· Observatory (starfield, aurora=XP velocity, Orrery=jobs, world-map Long View) Â· locked gates render as "it will grow into this."
**Accept:** stage=3 in DB â†’ Widening plays â†’ Wilderness reachable, Grove still standing Â· stage=4 â†’ Observatory Â· gates lock correctly below threshold.
**Commit:** `feat(world): the Widening â€” Digital Wilderness + Observatory realms`

## W-8 â€” Full-game layer
Diegetic chat at the Hollow/Hearthstone (speech bubbles anchored to the pet, streaming caret in-bubble; the Chat surface stays the power path) Â· clickable crystals open the REAL memory (`memory_id` already in payload) Â· approved skills become placeable Foundry monuments (the only earned decoration) Â· walk-to mode Â· fetch minigame Â· proactive check-ins as world events (rides the v0.3 heartbeat) Â· subagent Lumenforms at the Council Table (Elder) Â· optional ambient soundscape (OFF by default).
**Accept:** a full conversation conducted entirely in-world Â· crystal click shows real memory text Â· charm-never-blocks audit: every feature ignorable, zero XP from play.
**Commits:** `feat(world): diegetic chat` Â· `feat(world): living memories, monuments, play`

## Beyond (world-framed)
Scheduler/journal/palette (v0.3 â†’ journal readable at the Reading Root) Â· Telegram + approvals (v0.4 â†’ approval = pet presenting a request bubble) Â· Documents/Tasks/Calendar/Research/Email surfaces (v0.5/0.6 â†’ their Places already exist in realms II/III) Â· MCP client.

## Final "trailer test"
Fresh machine â†’ INSTALL â†’ START â†’ The Quickening births world + pet â†’ first directed chat â†’ pet walks to the Workbench as a real tool runs â†’ a memory crystal sprouts and is planted â†’ XP motes flow to the Spore Gate â†’ 60s screen-record. If the clip doesn't make someone ask "what IS that app?", iterate before shipping.
