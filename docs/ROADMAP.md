# NeuraClaw — Roadmap & Live Status

> **Cross-app source of truth.** Both Claude Code apps (this one + Antigravity) read THIS file from the repo. On a fresh run: read this first, then the deep docs (`docs/PRD.md`, `docs/WORLD-BIBLE.md`, `docs/ARCHITECTURE-WORLD.md`, `docs/refs/gravity-garden-teardown.md`). Keep it updated as work lands.

## Vision (one line)
An AI companion **pet that lives autonomously in a low-poly 3D game world** that runs on **everyone's PC incl. low-end** — fluid controls, the pet roams to places to do real work (task→Workbench, research→a research spot), grows over time. "AI in games."

## The Mission (Locked 2026-06-15)
**Combine clicky + hermes-agent + odysseus + vellum into NeuraClaw**
- **Phase 1 — Proactivity & "grows with you" (hermes + vellum core):** Async scheduler, hourly heartbeat (cheap-model gated), nightly journal (`NOW.md`-style scratchpad), finish `mood`.
- **Phase 2 — Productivity surfaces (odysseus-inspired UX):** Tasks, Calendar, Documents, Research, Email stubs -> real surfaces. Web-first, Radix UI, matching tools.
- **Phase 3 — Deeper memory & multi-channel reach (hermes + vellum):** Richer memory (episodic, emotional, procedural), Telegram multi-channel gateway, actor identity tiers, subagents / MCP.
- **Phase 4 — Tauri native desktop shell + clicky-style screen pointing:** Tauri wrapper, native notifications, global push-to-talk hotkey, screen pointing with `[POINT:x,y:label]` tool tags.

## Where we are now (2026-06-14) — current ≈ **V-2.x**
**V-2 (pet) and V-3 (props) are both in active development; V-1 shipped.**

| Phase | What | Status |
|---|---|---|
| **V-1** Living world | big island · roaming pet + eased follow-cam · memory crystals · weather × day/night · Gravity-Garden look pass (bloom/motes/rim) | ✅ SHIPPED |
| **V-2** Pet | procedural screen-faced **robot** + data-driven expression face (`FaceScreen`, `petAnim.ts`) | 🔨 IN PROGRESS |
| **V-2.5** Hardening | game-dev gap-closure — **see track below** | ⏳ NEXT |
| **V-3** World props | Quaternius **CC0** GLB trees/rocks replacing procedural scatter | 🔨 IN PROGRESS |
| **World v2** · Bioluminescent Village | medieval village (buildings · roads · fences · plaza) under the bioluminescent dusk layer; pet walks roads building→building | 🔒 LOCKED — full spec → `docs/WORLD-VILLAGE.md` |
| **V-4** Voice | STT in + TTS out, voice-primary (browser-native; partly wired) | ◐ PARTIAL |
| **V-5** OS-control | computer-use, trust-gated + kill-switch | ⏸ later (risky) |
| **V-6** Exploration | XP-unlocked regions / realms ("The Widening") | ⏸ later |
| **V-7** Gesture | webcam pet-stroke + pinch-zoom (MediaPipe, local) | ⏸ deferred |
| **Ship** | **Tauri v2 + Python sidecar** Windows installer (DECIDED: Path B) | ⏸ capstone |

**Baselines (keep green):** 72 pytest · 100 vitest · `npm run build` passes · world chunk ≤350 kB gz.
**World engine = react-three-fiber + three** (`frontend/src/world3d/`). NOTE: AGENTS.md / older docs say PixiJS — **superseded**; the live world is r3f. `frontend/src/world/` (Pixi) is legacy/dead **except** `crystalSeed.ts` + `entities/lumenform/LumenformFSM.ts` (still reused).

> **Workflow rule:** research/planning happens in the **Claude Code app**; building happens in **Antigravity** (Claude Code), same machine, same repo. **Every locked decision lands HERE in the repo** (`D:\NeuraClaw v1`) so Antigravity sees it. The `.claude/plans/` file is the research-app scratchpad — NOT authoritative for builds.

---

## 🔒 WORLD DIRECTION (LOCKED 2026-06-14) — Bioluminescent Medieval Village
The world = a small low-poly **MEDIEVAL VILLAGE** (buildings · cobble roads · fences · central plaza) with the **BIOLUMINESCENT magic as the mood layer painted over it** (ember-glowing windows/lanterns, glow-mushrooms along the roads, ember memory-crystals, weather × day/night, bloom, drifting motes). The pet **walks the roads building→building** to do its work. Recolor the medieval CC0 assets to our **dusk tokens** — a screenshot must read **"magical dusk hamlet", not "daytime RPG town."**
**Locked layout:** central **plaza/hearth** hub · buildings **radiate** · cobble roads **spoke out**. Pet **home = central plaza by the hearth**. **First cut = plaza + 3 buildings + roads** — Hollow (chat) = tavern w/ fireplace · Workbench (notes) = workshop/forge · Memory Garden (memory) = greenhouse/shrine where crystals grow.
**Additive** — keeps terrain, weather, glow, crystals, camera, locomotion, places. **Full build-ready spec → `docs/WORLD-VILLAGE.md`** (read it before building the village).

## 🔒 Locked decisions (cross-app log — everything we've decided, in one place)
- **World direction** → Bioluminescent Medieval Village (above; spec `docs/WORLD-VILLAGE.md`).
- **V-2 Pet** → procedural r3f **screen-faced robot** + data-driven face; ember-indigo tokens; rounded floaty silhouette; **robot from hatch**, stages = plating/antennae/glow upgrades. No GLB/credits. (`Lumenform3D.tsx` + `pet/face.ts`; wire the existing `petAnim.ts`.)
- **V-3 Props** → Quaternius **Ultimate Stylized Nature** (CC0) — pack in repo (gitignored), convert FBX→GLB via `npx fbx2gltf` → `frontend/public/models/nature/`, **keep albedo** (lighting sets mood), instanced. Used for the village's **grove edges**.
- **Assets (all CC0/permissive)** → Quaternius (nature/creatures) · **KayKit** (medieval buildings/fences + rigged chars/animations) · Kenney (roads/village) · Poly Haven (HDRI) · ambientCG (textures) · Mixamo (humanoid anims). Reference bundle: **`levy-street/world-of-claudecraft`** (MIT code + CC0 assets — mine for asset packs + rigged-char/animation + canvas-icon technique; **don't clone the MMO**). Rule: CC0 default · CC-BY keep a CREDITS file · avoid NC/GPL.
- **Gravity Garden** → cleared-to-reuse (Higgsfield remix + CC0); look-pass (bloom/motes/rim) **SHIPPED**. Teardown `docs/refs/gravity-garden-teardown.md`.
- **Windows app** → DECIDED **Path B: Tauri v2 + Python sidecar** (PyInstaller backend, P-0..P-5). Capstone — after world v1 + the GPU/2D-fallback debt.
- **V-7 Gesture** → webcam pet-stroke + pinch-zoom (MediaPipe, local, 0 credits). **DEFERRED** — after world alive + voice.
- **V-2.5 Hardening** → the track below (GPU-tier/quality-ladder/2D-fallback, audio, wire petAnim, tool→place routing, quick-wins).

---

## V-2.5 — HARDENING TRACK (from the game-dev gap audit, 2026-06-14)
Goal: close the gap from *tech demo* → *game*. Almost all **wiring, not rewrites**. Order below = recommended.

### 🔴 Blockers (directly contradict the core pitch)
- [ ] **GPU-tier detection + FPS quality ladder + 2D fallback in the LIVE world.** The existing `FpsDegrader` is wired to the DEAD Pixi path — it protects nothing at `/den`. Build: (1) probe WebGL2 + parse `gl.RENDERER` at Canvas mount → tier flag in zustand; gate `Postfx` bloom on `tier!=='low'` (not just reduced-motion — see `Postfx.tsx` TODO). (2) `useFrame` fps-meter (rolling 60-frame avg) → quality rung in zustand; `Particles3D/Rain3D/Clouds3D/GlowMushrooms3D` read it + shed load (55/45/35/25 ladder). (3) no-WebGL2 → static 2D pet+island fallback (`palette.ts` tokens). Port the `FpsDegrader` hysteresis into an r3f hook. **~1wk.**
- [ ] **No audio at all** (no dep, zero `AudioContext`). Thin Howler/Web-Audio layer: 1 ambient loop + rain crossfade + 3–4 SFX off existing `worldStore` events (`memory.formed`, `pet.levelup`, celebrate, hatch). Mute toggle. Hooks already in `worldStore.connect()`. **~3–5d.**

### ⚡ Quick wins (hours each — do as ONE batch; biggest feel/perf per effort, low risk)
- [ ] `antialias:false` in Canvas `gl` (`World3D.tsx`) — MSAA fights the faceted low-poly look + costs frames on integrated GPUs.
- [ ] Bloom grade (`Postfx.tsx`): raise `luminanceThreshold` ~0.72→**0.9**, `intensity` 0.7→**0.4**; add **Vignette + HueSaturation** passes (already in `@react-three/postprocessing`). Single biggest art uplift.
- [ ] **Pause-on-blur**: `World3D` `visibilitychange` → `frameloop='demand'` when hidden (stops hidden-tab fan-spin).
- [ ] **Canvas ErrorBoundary** around lazy `DenView` + `World3D` (WebGL crash → recoverable, not blank black).
- [ ] Pet turn/lean/gaze: `Math.min(1,k*dt)` → `1-Math.exp(-k*dt)` (`Lumenform3D` ~145/147/156) — currently **5× too fast at 144Hz**, breaks the "never snappy" rule.
- [ ] **Camera-terrain clearance** in `CameraRig` (sample `islandHeight` at camera x/z, push up) — camera clips through the island at close zoom.
- [ ] **Anticipation gaze** on tool-start (~600ms gaze toward target before moving; flip face to 'working' only on arrival) — reads as deciding, not executing.
- [ ] Idle RNG: seed from pet DB id, not constant `0x10fc` (`worldStore`) + `lastGesture` anti-repeat — kills the identical-every-session idle loop.
- [ ] `castShadow=false`/`receiveShadow=false` on transparent meshes (sea, pool surface, XP fill, rain, clouds); tighten shadow frustum ±22→**±16** (island radius).
- [ ] Derive `Island.tsx` `CLEAR_ZONES` from the place table (remove one duplicate coord copy).

### 🟠 High gaps (1–5d each)
- [ ] **Tool→place routing.** `worldStore.toWorldEvent()` drops the tool name; every `tool-start` → the single Workbench. Pass `ev.tool` through; add a pure `toolCategoryToPlace()`; add **`garden`/`hollow` to the `Place` type + `ANCHORS`** so the pet can visit its Memory Garden (today structurally impossible — `Place` vs `PlaceKind` name mismatch). ~1–2d.
- [ ] **Wire `petAnim.ts`** (breath→body `scale.y`, head-nod, squash/stretch on hop/land, blink-into-expression swap, per-gesture arm poses). Library is written + tested but mostly **unwired** in `Lumenform3D` (imports only gazeYaw/glow/shadow). Highest alive-payoff for least new code. ~1–2d.
- [ ] **Drives/mood.** Add `mood`+`energy` to `LumenformState`; work drains, memory/skill events charge; weight `scheduleIdle` by them; weather/time bindings (storm→shelter/nap, fog→slower wander). ~3–5d.
- [ ] **Milestone screen-space juice.** Level-up swell + celebrate sparkles are sub-pixel at default zoom — add FOV punch + brief auto-zoom + a CSS ember flash on `pet.levelup`. (Effects are fine; fix is camera-side.) ~1–2d.
- [ ] **Robot↔world art rhymes** so the robot doesn't read as "dropped into a nature game": data plates near the Workbench, cyan seam on the bench marker (`botEye`), ember rim on the Hollow fire (`botGlow`). ~1–2d.

### 🏗️ Architecture (deliberate, not under deadline)
- [ ] **Single `placeRegistry`.** Collapse the 4–5 duplicate place/coord tables (`places.ts` PLACES + NAV_PLACES, `placeDefs.ts` PLACES_3D, `locomotion.ts` ANCHORS, `Island.tsx` CLEAR_ZONES) into one id-keyed registry; reconcile the `Place` vs `PlaceKind` name split. **Decide first whether the 2D `places.ts` path is live or dead.** Prereq for realms. ~1–2d.
- [ ] **`realmData.ts` + realm system** (per-realm camera bounds, unlock thresholds, place lists) — prereq for The Widening (V-6); persist active realm in hydrate. ~3–5d.
- [ ] **V-3 perf debt** (do IN the V-3 pass): Draco + LOD + cut tree variants on the 18 GLBs (3.4 MB uncompressed now).

### 🕵️ Gotchas (don't trip on these)
- The `FpsDegrader` in `world/engine/` is **DEAD** (Pixi) — quality-scaling does NOT exist in the live world.
- `Place` vs `PlaceKind` unions use **different names** → compiler can't reconcile; the pet literally cannot route to `garden` today.
- `petPosition.ts` mutable singleton OUTSIDE React is **INTENTIONAL** (zero-alloc camera ground-truth) — do NOT "clean it into the store" (reintroduces camera lag).
- Reduced-motion is read **once** at module load — toggling the OS mid-session does nothing; needs an in-app toggle.
- `antialias:true` actively fights the intended faceted look.

### Recommended order
1. Finish **V-3** props + its Draco/LOD debt (you're touching `nature/models.ts` anyway). 2. Wire **petAnim** + anticipation gaze (while V-2 is open). 3. **GPU-tier / 2D-fallback** blocker sprint (+ antialias + shadow opt-outs). 4. **Quick-win fundamentals** batch (pause-blur, error boundary, bloom grade) + the World settings panel once the quality store exists. 5. **Camera-feel** polish. 6. **Autonomy depth** (tool→place, mood, weather). 7. **placeRegistry → realms**. **Audio** slots in any time after the hardening sprint.
