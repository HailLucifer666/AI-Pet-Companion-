# AI Pet Companion â€” World Architecture

**v1.0 Â· 2026-06-13** Â· Engineering spine for [WORLD-BIBLE.md](WORLD-BIBLE.md) Â· Build order in [BUILD-PLAN-v0.3-WORLD.md](BUILD-PLAN-v0.3-WORLD.md)

> Goal: a 60fps PixiJS world that renders **only real data**, reuses the existing screenshot-tested productivity UI unchanged, and never blocks the fast path. Validated against an architecture review; load-bearing pixi.js v8 + Vite specifics are re-confirmed at W-2 via current docs before relying on them.

## 1. Composition
- `/den` = a **full-bleed PixiJS canvas** behind the persistent left rail. The rail stays the **fast path**; its icons are now "shortcuts to Places."
- **Surfaces open as DOM overlay panes** (`surface-overlay` token) over the dimmed, still-animating world â€” a portal transition from the Place's on-screen position. The existing Chat/Memory/Notes/Settings UI is **reused unchanged**; only its container/entry changes.
- An ambient **~40px pet widget** anchors every non-den surface (already shipped in `AppShell.tsx`); click â†’ fly home to `/den`.
- **z-order:** canvas `0` < rail `10` < overlay `50`. Canvas gets `pointer-events: none` while an overlay is open.

## 2. Module tree â€” `frontend/src/world/`
- `engine/` â€” `WorldEngine` (raw imperative class, **not** `@pixi/react` â€” avoids StrictMode double-destroy; `destroyed`-flag + cleanup-first), `SceneGraph`, `Camera`, `ParallaxManager`, `FpsDegrader`, `WorldToScreen`.
- `entities/` â€” `Lumenform` + pure `LumenformFSM`, `Place`, `MemoryCrystal`, `MyceliumNet`, `ParticleSystem`.
- `art/` â€” procedural generators as **humble objects**: a pure, testable `computeDrawSpec()` separated from the Pixi draw calls.
- `cinematics/` â€” `CinematicDirector` (queue, skippable, reduced-motion stills) + the 4 named cinematics.
- `realms/realmData.ts` â€” **pure data**: places, camera bounds, unlock stages.
- `state/` â€” `worldStore` (zustand) + `storeBridge`. **One-directional storeâ†’engine** via `storeBridge.subscribe`. The single outbound channel is a `world:place-activated` DOM `CustomEvent` â†’ React routing. No circular deps.
- `hooks/useWorldAnchor` â€” RAF `worldToScreen` projection so DOM speech-bubbles / HUD can pin to world positions.
- `hydration/WorldHydrator` â€” REST snapshot â†’ render â†’ open SSE.

The existing `frontend/src/state/creatureStore.ts` (M-0.2b) and `lib/synapse.ts` feed the world; the world layer is an additive consumer of the same event stream.

## 3. The contract with reality
- **Zero new DB tables for the world.** Crystal geometry + layout = **deterministic from the `memory_id` seed** (mulberry32 PRNG) â€” the same memory always grows the same crystal. Skills/stage/XP read from existing + W-1 tables. Pet position / camera / weather = session-only state.
- **Token bridge:** Pixi colors are read from CSS custom properties at init (`getComputedStyle` â†’ oklchâ†’hex). Tokens stay single-sourced; **zero hardcoded colors**.
- **Hydration order:** REST snapshot first (`GET /api/pet`, `/api/memory`, `/api/skills`) â†’ render the full world â†’ **then** open the `/api/events` SSE for increments. Reconnect = re-hydrate from REST + diff (REST is authoritative).

## 4. Performance contract
- 60 fps target. **Degrade ladder** (fps-meter driven): 55â†’idle particles off Â· 45â†’Mycelium static Â· 35â†’cap 30fps Â· 25â†’full static.
- Ticker stops on hidden tab (`visibilitychange`). Battery-low â†’ 30fps at mount. WebGL **context-loss â†’ rebuild engine + re-hydrate**.
- Particle budgets: idle â‰¤150 / burst â‰¤400 / cinematic â‰¤800.
- **Lazy chunk:** Vite `manualChunks: { world: ['pixi.js', ...] }` + `React.lazy(DenView)`. Main chunk stays ~207 kB gz; the world chunk has its own â‰¤350 kB gz budget, paid only on first `/den`, cached after.

## 5. Accessibility â€” "static-but-alive"
`prefers-reduced-motion` renders **one composed frame**; state changes via instant re-composition (the pet *is* at the Workbench; the crystal *is* present). All real information preserved â€” only in-betweening removed. Canvas `role="img"` + `aria-label`; Places expose invisible DOM buttons via `useWorldAnchor` for screen-reader + full keyboard parity (Tab/Enter/Esc/WASD/M).

## 6. Testing
node-env vitest covers the pure cores: `LumenformFSM`, `CrystalGenerator` (**snapshot** â€” determinism is a user-facing promise; a refactor must never reshuffle someone's garden), camera math, `worldStore` reducers, `WorldHydrator` (mocked api). Visual QA via a DEV `/world-styleguide` route (stageÃ—pose grid, cinematic trigger buttons, crystal-species board) + screenshot gates before each checkpoint commit.

## 7. Risk table
| Risk | Mitigation |
|---|---|
| Pixi v8 + Vite tree-shaking bloat | `sideEffects` override, subpath imports if gz high; measure per checkpoint |
| StrictMode double-mount WebGL | `destroyed`-flag + cleanup-first (designed, dev-tested via mount/unmount/remount) |
| Canvas a11y opaque | DOM hit-area buttons + `role=img` + static fallback + keyboard parity |
| Procedural art looks cheap | `/world-styleguide` iteration gate before each commit; silhouette + glow carry small sizes |
| Scope gravity (game eats product) | Realms gated behind REAL usage; productivity surfaces untouched; rail fast-path sacred |
| Crystal determinism broken by refactor | Snapshot tests on `CrystalGenerator` |
| Overlay/canvas event routing | canvas `pointer-events:none` when overlay open; z-layers canvas0 < rail10 < overlay50 |

## 8. Inherited backend facts (relevant to the world)
Synapse bus: `core/synapse.py` (module singleton, drop-oldest, `sse_stream`), `GET /api/events`. Emit points: `core/agent.py` (`run_turn(synapse=)`), `memory/store.py` (`memory.formed`/`memory.forgotten`), `skillsys/reflector.py` (`skill.drafted`, dormant until the reflector is wired into the chat loop in v0.3). **Payload keys never `type`** â€” memory type travels as `memory_type`. `core/__init__.py` is deliberately side-effect-free to avoid an import cycle (see `236a923`).
