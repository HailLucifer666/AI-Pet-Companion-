# AI Pet Companion v0.2 â€” "A Creature, Not A Chatbot" Build Plan

**Rev 2 (supersedes Rev 1)** Â· 2026-06-13 Â· Source of truth: [PRD.md](PRD.md) Â· Repo: `D:\AI Pet Companion v1`

---

## What changed vs Rev 1, and why

Rev 1 was a competent skin-and-sprite plan. Rev 2 makes three structural upgrades that turn v0.2 from "Tamagotchi sticker on a chat app" into a defensible product concept:

| # | Upgrade | Why it's the difference |
|---|---|---|
| 1 | **Synapse: a global event bus (backend â†’ SSE â†’ every surface)** | Rev 1 wired creature state from inside ChatView only. Wrong layer. The agent's real activity (thinking, tool running, memory formed, skill drafted, XP awarded, level-up) becomes a first-class event stream the whole UI subscribes to. The creature is *connected to the brain*, not to one React component. This is also the delivery rail for v0.3 proactive pings and v0.4 approvals â€” build it once, everything later rides it. |
| 2 | **Growth Ladder: stages unlock real capability** | Rev 1's XP changed pixels. Rev 2: each life stage unlocks an actual agent power â€” the pet doesn't just *look* grown, it *is* more capable because you raised it. Hatchling: chat+memory+notes. Juvenile (250 XP): web research + daily journal. Adult (1,000): proactive check-ins + skill drafting. Elder (3,000): subagents + autonomous scheduled tasks. Locked powers render as "it will grow into this" â€” never as a paywall, and a Settings override unlocks everything instantly (PRD principle 3: charm never blocks work). Growth becomes the product's progression system, not decoration. |
| 3 | **Semantic reactions, not busy-states** | Creature reacts to *what happened*, not just "agent busy": memory formed â†’ ear-flick + glance at Memory rail icon; skill draft â†’ excited hop + badge; first mention of a new project â†’ `curious` mood for the day. Cheap to implement once Synapse exists (reactions map 1:1 to event types). This is what makes people record their screen and post it. |

Everything else from Rev 1 survives: checkpoint order aâ†’bâ†’câ†’d, `motion` + Radix decisions, tokens-only styling, all guardrails, all verification gates.

---

## Locked decisions

- **Motion:** `motion` package (maintained framer-motion successor) â€” AnimatePresence, springs, stagger, variants. MIT.
- **Controls:** Radix unstyled primitives, styled by our tokens. MIT.
- **Event transport:** one long-lived SSE channel `GET /api/events` (POST-SSE reader already exists in `frontend/src/lib/sse.ts`; reuse parser, GET variant). WebSocket rejected: SSE is sufficient for serverâ†’client, zero new deps, survives proxies.
- **Creature art:** hand-built layered SVG (no sprite sheets, no Lottie dependency, no licensed IP). Body = stacked glowing strokes; stages = silhouette component variants; expressions = transform/opacity variants on named layers (ears, tail, eyes, aura).
- **Checkpoint discipline:** build â†’ verify â†’ commit at each of a/b/c/d. Never two checkpoints in flight.

**Guardrails (unchanged, binding):** MIT-only deps Â· zero native OS controls Â· tokens-only styling (no hardcoded colors) Â· extend `components/ui.tsx` patterns Â· WCAG 2.2 AA + full `prefers-reduced-motion` fallback (static creature art) Â· 31 pytest / 8 vitest baseline never breaks Â· server-side XP only, daily caps, claw-backs Â· no guilt mechanics, no decay, no nagging Â· conventional commits Â· done = build green + tests green + live screenshot bar ("would it survive next to Linear/Raycast?").

---

## M-0.2a â€” Design System: "Bioluminescent Terminal" *(unchanged from Rev 1 â€” already correct)*

Pure presentation layer. Backend untouched.

**Deps:** `motion`, `@radix-ui/react-select`, `@radix-ui/react-dialog`, `@radix-ui/react-toast`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip` (verify latest via `npm view` at install).

**Files:**
- `frontend/src/styles/theme.css` â€” ADD: elevation surfaces (`--surface-page/raised/overlay` + inner-highlight borders `inset 0 1px 0 0 oklch(100% 0 0 / 6%)` + tiered shadows); body radial atmosphere (layered radial-gradients, faint claw glow on deep ink); **activity-glow token** `--activity` (0â†’1 CSS var, consumed by accent borders + creature aura â€” Synapse sets it live in 0.2b); motion tokens (`--dur-fast:150ms; --dur-base:300ms; --dur-slow:500ms; --ease-out-expo:cubic-bezier(0.16,1,0.3,1)`); `shimmer` + `pulse-glow` keyframes; global reduced-motion kill-switch.
- `frontend/src/components/ui.tsx` + new files â€” `Select`, `Dialog`, `Popover`, `Tooltip`, `Toast` system (Toaster viewport + zustand `toastStore` + `toast()` callable anywhere), `Skeleton`; hover-lift/active-press (scale .97) on Button/IconButton/Card via CSS (reserve `motion` for orchestration).
- `frontend/src/lib/useUndoableDelete.ts` (new) â€” optimistic cache removal + 5s undo toast; commit DELETE on expiry, restore on undo; timers cancel on unmount.
- `frontend/src/app/shell/AppShell.tsx` â€” route crossfade (`AnimatePresence mode="wait"` keyed on pathname); rail `title=` â†’ styled Tooltips.
- `frontend/src/main.tsx` â€” mount `Tooltip.Provider` + `<Toaster/>`.
- Chat/Memory/Notes views â€” native selects â†’ `<Select>`; skeletons + mount-stagger; deletes through `useUndoableDelete`; streaming caret shimmer in chat.
- `Styleguide.tsx` â€” sections for every new primitive + elevation swatches + motion demo. **This page is the screenshot contract.**
- `frontend/index.html` + `frontend/public/favicon.svg` (new) â€” ember/claw SVG favicon.

**Accept:** lint/test/build green Â· `/styleguide` exercises every primitive Â· zero native controls on any surface Â· undo toasts on all deletes Â· reduced-motion suppresses animation, layout intact Â· pytest still 31 Â· screenshots (styleguide + 4 surfaces @ 1280/768) read "bioluminescent terminal", not template.

**Commit:** `feat(ui): bioluminescent design system â€” tokens, motion, Radix primitives, skeletons, undo toasts`

---

## M-0.2b â€” Synapse + Creature Engine *(restructured â€” the nervous system ships here)*

### Backend: Synapse event bus (new, small, load-bearing)
- `backend/src/AI Pet Companion/core/synapse.py` (new): in-process async pub/sub. `publish(type, payload)` â†’ fan-out to subscriber queues. Event types v0.2: `agent.thinking`, `agent.tool.start/end`, `agent.done`, `memory.formed`, `memory.forgotten`, `skill.drafted`, `xp.awarded`, `pet.levelup`, `pet.stage` (xp/pet types fire from 0.2d).
- `GET /api/events` (in `api/routes.py`): long-lived SSE; replays nothing (live-only), heartbeat comment every 25s.
- Wire publishers: agent loop (`core/agent.py`) emits thinking/tool/done; memory store emits formed/forgotten; reflector emits skill.drafted. ~15 lines of emits total â€” events mirror the `AgentEvent`s already yielded, one level up.
- Tests: pub/sub fan-out, slow-subscriber doesn't block publisher (bounded queues, drop-oldest), SSE endpoint streams a published event.

### Frontend: creature + ambient presence
- `frontend/src/lib/synapse.ts` (new): GET-SSE subscriber (reuse `SSEParser`), auto-reconnect w/ backoff, feedsâ€¦
- `frontend/src/state/creatureStore.ts` (new, zustand): `{stage, xp, state, mood, lastEvent}`; reducer maps Synapse events â†’ creature states with priority (sleeping < idle < curious < thinking < working < learning < celebrating) + app-idle timer (>30 min â†’ sleeping; StrictMode-idempotent).
- `frontend/src/components/creature/Creature.tsx` (new): layered SVG familiar, `stage: 1|2|3|4`, `size` prop (40â†’320px), named layers (body/eyes/ears/tail/aura) animated by `motion` variants per state; **semantic micro-reactions**: `memory.formed` â†’ ear-flick + brief glance toward rail; `skill.drafted` â†’ hop + sparkle; aura intensity = `--activity`. `prefers-reduced-motion` â†’ static art, state shown by eye/aura color only.
- Ambient widget: ~40px live creature in rail above StatusStrip, mirrors store, click â†’ `/den` (route stub until 0.2d).
- Styleguide: creature gallery â€” 4 stages Ã— key states grid + reaction trigger buttons.

**Accept:** send a chat message â†’ rail creature visibly thinksâ†’works(tool)â†’idles **from any surface** (proof Synapse, not ChatView, drives it) Â· agent stores a memory â†’ ear-flick reaction fires Â· pytest grows (synapse tests) + vitest grows (store reducer tests) Â· reduced-motion static fallback verified.

**Commit:** `feat(synapse): global agent event bus over SSE` Â· `feat(creature): vector familiar, live-state machine, semantic reactions, ambient widget`

---

## M-0.2c â€” Hatch Ritual *(+ provider-aware onboarding)*

### Backend
- `migrations/004_pet_xp.sql`: `pet(id=1 CHECK, name, user_name, voice, stage, xp, mood, traits_json, hatched_at)` + `xp_events(id, type, amount, ref, created_at)` (consumed in 0.2d, created here to keep one migration).
- `GET /api/pet` â†’ row or `null` (first-run signal). `POST /api/hatch` `{answers}` â†’ create pet row Â· regenerate `SOUL.md` from template + answers (name, user name, voice, focus, boundaries) Â· seed `user_profile` + first `preference`/`identity` memories Â· first journal-style memory ("I hatched...") Â· publish `pet.stage`.
- **Provider detection** in `GET /api/pet` response: `{pet, brain: {ollama: bool, cloud_keys: bool}}` â€” probe `localhost:11434/api/tags` (1s timeout) + key env presence.

### Frontend
- `frontend/src/features/hatch/HatchRitual.tsx` (new): full-screen void Â· pulsing egg (reuses Creature aura tokens) Â· 5 questions one-at-a-time (PRD Â§3.1 list) Â· egg glow/crack progresses per answer Â· **brain check step**: if no Ollama and no cloud keys, show calm inline guidance ("it needs a mind â€” paste an OpenRouter/NVIDIA key or start Ollama"), with a working key-paste field (`POST /api/settings/keys` writes `.env`, reloads provider config â€” add endpoint, 20 lines) Â· final crack â†’ stage-1 creature hatches, greets by name in chosen voice â†’ lands in Den (or Chat until 0.2d) with **3 suggested first prompts** ("Tell it what you're working on", "Teach it a preference", "Ask it to research something") â€” the first 5 minutes are directed, not blank.
- Gate in `App.tsx`: `pet === null` â†’ ritual replaces shell entirely.

**Accept:** wipe `data/` â†’ launch â†’ full ritual â†’ SOUL.md contains answers verbatim-derived content â†’ creature greets by chosen name in chosen voice â†’ suggested prompts work â†’ `pet` row exists; with no keys+no Ollama the brain step appears and a pasted key persists to `.env` and chat works without restart.

**Commit:** `feat(hatch): first-run ritual, pet table, SOUL regeneration, brain detection + key onboarding`

---

## M-0.2d â€” Den, XP Engine, Growth Ladder *(the product thesis lands here)*

### Backend
- `backend/src/AI Pet Companion/pet/xp.py` (new): `award(db, type, ref)` â€” PRD Â§3.3 rates, per-day caps per type, claw-backs (memory delete â†’ âˆ’5); stage thresholds 0/250/1000/3000; publishes `xp.awarded` / `pet.levelup` / `pet.stage`. Hooks (one line each): agent turn done +2 Â· memory formed +5 Â· tool ok +3 Â· note created +5 Â· skill drafted +10 / approved +25 / reused +5.
- **Growth Ladder** `backend/src/AI Pet Companion/pet/ladder.py` (new): capability map `{web_research: 2, journal: 2, proactive: 3, skill_drafting: 3, subagents: 4, autonomous_jobs: 4}`. Enforcement: registry dispatch + reflector check stage (or `config.trust.ignore_ladder: true` override â€” Settings exposes it, principle-3 escape hatch). Locked tool call â†’ friendly refusal string ("Not grown enough for this yet â€” Stage 3 unlocks it").
- `GET /api/den`: pet + xp ring data + last 20 `xp_events` + "while away" digest (memories formed since `last_seen`, drafts pending) + ladder status (unlocked/next).

### Frontend
- `frontend/src/features/den/DenView.tsx` (new): creature center-stage (320px, full animation) Â· name/stage/XP progress ring (SVG, animated on award) Â· mood line Â· Growth Ladder strip (unlocked powers lit, next power with XP-to-go â€” framed as *its* growth: "Soon it will check in on you") Â· "while you were away" digest Â· latest journal entry slot (stub copy until v0.3) Â· days-alive + quick actions.
- Route `/den`, rail icon top slot, index + `*` redirects â†’ `/den` (post-hatch landing).
- Level-up: `pet.levelup` Synapse event â†’ celebrating animation + toast; stage change â†’ silhouette morph transition in Den.

**Accept:** chat exchange visibly +2 XP in Den ring (via Synapse, no refresh) Â· memory delete claws back âˆ’5 Â· day-cap enforced (unit test) Â· at stage 1 `web_search` refused with growth message; flip override â†’ allowed Â· level-up toast + celebration fires crossing 250 Â· full v0.2 exit test (PRD Â§7): fresh install â†’ hatch â†’ chat â†’ creature reacts + earns XP â†’ UI survives screenshot bar.

**Commit:** `feat(pet): XP engine with caps+clawbacks` Â· `feat(den): Den home, growth ladder, level-up celebration`

---

## Risks

| Risk | Mitigation |
|---|---|
| Synapse slow-subscriber backpressure | Bounded per-subscriber queues, drop-oldest, never block publisher (tested) |
| Growth Ladder reads as paywall-y | Framing is *its* growth, not your restriction; one-click override in Settings; default ladder generous (chat/memory/notes never locked) |
| SVG creature uncanny/cheap | Iterate in styleguide gallery first; silhouettes simple + bold; motion sells it more than detail |
| Bundle creep (motion + Radix) | ~34kb + tree-shaken slices; check `npm run build` gz per checkpoint, budget <300kb |
| Radix Select height in chat composer row | Match Textarea baseline explicitly |
| StrictMode double effects (idle timer, SSE) | Idempotent effects, cleanup-first pattern |
| `.env` write endpoint = secret handling | Localhost-only server already; never echo key back; mask in GET /settings; file perms note in RUNBOOK |

## Out of scope (v0.2)

Ctrl+K palette, journal generation, scheduler/heartbeat (v0.3) Â· Telegram/approvals UI (v0.4) Â· Documents/Tasks/Calendar/Research/Email surfaces (v0.5/0.6) Â· creature species variations (PRD open Q1 default: one species, personality-tinted).

## Exit test (PRD Â§7, binding)

Fresh machine: clone â†’ INSTALL.bat â†’ START.bat â†’ hatch ritual â†’ first directed conversation â†’ creature thinks/works/reacts in rail â†’ XP ring moves â†’ Den shows growth ladder â†’ screenshots at 1280/768 pass the Linear/Raycast bar. Then v0.3 "Growth".
