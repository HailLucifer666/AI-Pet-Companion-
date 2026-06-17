# AI Pet Companion â€” Roadmap & Live Status

> **Cross-app source of truth.** Both Claude Code apps (this one + Antigravity) read THIS file from the repo. On a fresh run: read this first, then the deep docs (`docs/PRD.md`, `docs/WORLD-BIBLE.md`, `docs/ARCHITECTURE-WORLD.md`, `docs/refs/gravity-garden-teardown.md`). Keep it updated as work lands.

## Vision (one line)
An AI companion **pet that lives autonomously in a low-poly 3D game world** that runs on **everyone's PC incl. low-end** â€” fluid controls, the pet roams to places to do real work (taskâ†’Workbench, researchâ†’a research spot), grows over time. "AI in games."

## The Mission (Locked 2026-06-15)
**Combine clicky + hermes-agent + odysseus + vellum into AI Pet Companion**
- **Phase 1 â€” Proactivity & "grows with you" (hermes + vellum core):** Async scheduler, hourly heartbeat (cheap-model gated), nightly journal (`NOW.md`-style scratchpad), finish `mood`.
- **Phase 2 â€” Productivity surfaces (odysseus-inspired UX):** Tasks, Calendar, Documents, Research, Email stubs -> real surfaces. Web-first, Radix UI, matching tools.
- **Phase 3 â€” Deeper memory & multi-channel reach (hermes + vellum):** Richer memory (episodic, emotional, procedural), Telegram multi-channel gateway, actor identity tiers, subagents / MCP.
- **Phase 4 â€” Tauri native desktop shell + clicky-style screen pointing:** Tauri wrapper, native notifications, global push-to-talk hotkey, screen pointing with `[POINT:x,y:label]` tool tags.

---

## ⚡ CURRENT STATUS (updated 2026-06-17) — supersedes the "V-2.x" table below

**Now ≈ Mission Phase 4 shipped; pivoting to Phases 1–2.** The bioluminescent village IS the live world, the Tauri native desktop shell ships, and the native Sight & Voice layer is merged.

| Track | Status |
|---|---|
| V-1 Living world | ✅ shipped |
| V-2 Pet — screen-faced robot + `petAnim` wired + mood/energy drives | ✅ shipped |
| V-3 World props — Quaternius nature, Draco-compressed | ✅ shipped |
| World v2 — Bioluminescent Village (plaza + buildings + roads) | ✅ shipped — **this is the live world** |
| V-2.5 Hardening — GPU-tier ladder · 2D fallback · audio · tool→place · camera feel | ✅ shipped (full track) |
| V-4 Voice — STT in / TTS out | ✅ shipped (browser-native) |
| Tauri native shell — Python sidecar · frameless controls · global hotkey | ✅ shipped |
| Sight & Voice (native) — Ctrl+Alt+S capture · push-to-talk · `[POINT]` desktop overlay | 🔨 merged — **pending live verification** |
| V-6 Realms / "The Widening" | 🔨 infra shipped; design spec → `docs/REALMS-DESIGN.md` |
| Phase 1 Autonomy — scheduler · heartbeat · journal · mood | ⏳ NEXT — plan → `docs/AUTONOMY-PHASE1.md` |

**Recently landed (2026-06-17):**
- `feat(build)` — capstone Tauri installer + PyInstaller sidecar (`41a7642`).
- `feat(sight-voice)` — screen-capture sight store + voice pipeline (`9250936`, WIP).
- `fix(world)` — resolved the instant 3D-Grove crash (bare GLTFLoader on meshopt-compressed village GLBs + missing `Well.glb`) and the foreground fog haze (`0721822`).

**Next two paths (both now specced in-repo for the build app):**
- **Path A — World expansion (V-6 realms):** `docs/REALMS-DESIGN.md`.
- **Path B — Autonomy (Mission Phase 1):** `docs/AUTONOMY-PHASE1.md`.

**Build baselines (keep green):** pytest · vitest · `npm run build` passes · world chunk ≤ 350 kB gz (currently ~315 kB gz ✅).

## Where we are now (2026-06-14) â€” current â‰ˆ **V-2.x**
**V-2 (pet) and V-3 (props) are both in active development; V-1 shipped.**

| Phase | What | Status |
|---|---|---|
| **V-1** Living world | big island Â· roaming pet + eased follow-cam Â· memory crystals Â· weather Ã— day/night Â· Gravity-Garden look pass (bloom/motes/rim) | âœ… SHIPPED |
| **V-2** Pet | procedural screen-faced **robot** + data-driven expression face (`FaceScreen`, `petAnim.ts`) | ðŸ”¨ IN PROGRESS |
| **V-2.5** Hardening | game-dev gap-closure â€” **see track below** | â ³ NEXT |
| **V-3** World props | Quaternius **CC0** GLB trees/rocks replacing procedural scatter | ðŸ”¨ IN PROGRESS |
| **World v2** Â· Bioluminescent Village | medieval village (buildings Â· roads Â· fences Â· plaza) under the bioluminescent dusk layer; pet walks roads buildingâ†’building | ðŸ”’ LOCKED â€” full spec â†’ `docs/WORLD-VILLAGE.md` |
| **V-4** Voice | STT in + TTS out, voice-primary (browser-native; wired/production-ready) | âœ… SHIPPED |
| **V-5** OS-control | computer-use, trust-gated + kill-switch | â ¸ later (risky) |
| **V-6** Exploration | XP-unlocked regions / realms ("The Widening") | â ¸ later |
| **V-7** Gesture | webcam pet-stroke + pinch-zoom (MediaPipe, local) | â ¸ deferred |
| **Ship** | **Tauri v2 + Python sidecar** Windows installer (DECIDED: Path B) | âœ… SHIPPED |

**Baselines (keep green):** 72 pytest Â· 100 vitest Â· `npm run build` passes Â· world chunk â‰¤350 kB gz.
**World engine = react-three-fiber + three** (`frontend/src/world3d/`). NOTE: AGENTS.md / older docs say PixiJS â€” **superseded**; the live world is r3f. `frontend/src/world/` (Pixi) is legacy/dead **except** `crystalSeed.ts` + `entities/lumenform/LumenformFSM.ts` (still reused).

> **Workflow rule:** research/planning happens in the **Claude Code app**; building happens in **Antigravity** (Claude Code), same machine, same repo. **Every locked decision lands HERE in the repo** (`D:\AI Pet Companion v1`) so Antigravity sees it. The `.claude/plans/` file is the research-app scratchpad â€” NOT authoritative for builds.

---

## ðŸ”’ WORLD DIRECTION (LOCKED 2026-06-14) â€” Bioluminescent Medieval Village
The world = a small low-poly **MEDIEVAL VILLAGE** (buildings Â· cobble roads Â· fences Â· central plaza) with the **BIOLUMINESCENT magic as the mood layer painted over it** (ember-glowing windows/lanterns, glow-mushrooms along the roads, ember memory-crystals, weather Ã— day/night, bloom, drifting motes). The pet **walks the roads buildingâ†’building** to do its work. Recolor the medieval CC0 assets to our **dusk tokens** â€” a screenshot must read **"magical dusk hamlet", not "daytime RPG town."**
**Locked layout:** central **plaza/hearth** hub Â· buildings **radiate** Â· cobble roads **spoke out**. Pet **home = central plaza by the hearth**. **First cut = plaza + 3 buildings + roads** â€” Hollow (chat) = tavern w/ fireplace Â· Workbench (notes) = workshop/forge Â· Memory Garden (memory) = greenhouse/shrine where crystals grow.
**Additive** â€” keeps terrain, weather, glow, crystals, camera, locomotion, places. **Full build-ready spec â†’ `docs/WORLD-VILLAGE.md`** (read it before building the village).

## ðŸ”’ Locked decisions (cross-app log â€” everything we've decided, in one place)
- **World direction** â†’ Bioluminescent Medieval Village (above; spec `docs/WORLD-VILLAGE.md`).
- **V-2 Pet** â†’ procedural r3f **screen-faced robot** + data-driven face; ember-indigo tokens; rounded floaty silhouette; **robot from hatch**, stages = plating/antennae/glow upgrades. No GLB/credits. (`Lumenform3D.tsx` + `pet/face.ts`; wire the existing `petAnim.ts`.)
- **V-3 Props** â†’ Quaternius **Ultimate Stylized Nature** (CC0) â€” pack in repo (gitignored), convert FBXâ†’GLB via `npx fbx2gltf` â†’ `frontend/public/models/nature/`, **keep albedo** (lighting sets mood), instanced. Used for the village's **grove edges**.
- **Assets (all CC0/permissive)** â†’ Quaternius (nature/creatures) Â· **KayKit** (medieval buildings/fences + rigged chars/animations) Â· Kenney (roads/village) Â· Poly Haven (HDRI) Â· ambientCG (textures) Â· Mixamo (humanoid anims). Reference bundle: **`levy-street/world-of-claudecraft`** (MIT code + CC0 assets â€” mine for asset packs + rigged-char/animation + canvas-icon technique; **don't clone the MMO**). Rule: CC0 default Â· CC-BY keep a CREDITS file Â· avoid NC/GPL.
- **Gravity Garden** â†’ cleared-to-reuse (Higgsfield remix + CC0); look-pass (bloom/motes/rim) **SHIPPED**. Teardown `docs/refs/gravity-garden-teardown.md`.
- **Windows app** â†’ DECIDED **Path B: Tauri v2 + Python sidecar** (PyInstaller backend, P-0..P-5). Capstone â€” after world v1 + the GPU/2D-fallback debt.
- **V-7 Gesture** â†’ webcam pet-stroke + pinch-zoom (MediaPipe, local, 0 credits). **DEFERRED** â€” after world alive + voice.
- **V-2.5 Hardening** â†’ the track below (GPU-tier/quality-ladder/2D-fallback, audio, wire petAnim, toolâ†’place routing, quick-wins).

---

## V-2.5 â€” HARDENING TRACK (from the game-dev gap audit, 2026-06-14)
Goal: close the gap from *tech demo* â†’ *game*. Almost all **wiring, not rewrites**. Order below = recommended.

### ðŸ”´ Blockers (directly contradict the core pitch)
- [x] **GPU-tier detection + FPS quality ladder + 2D fallback in the LIVE world.** The existing `FpsDegrader` is wired to the DEAD Pixi path â€” it protects nothing at `/den`. Build: (1) probe WebGL2 + parse `gl.RENDERER` at Canvas mount â†’ tier flag in zustand; gate `Postfx` bloom on `tier!=='low'` (not just reduced-motion â€” see `Postfx.tsx` TODO). (2) `useFrame` fps-meter (rolling 60-frame avg) â†’ quality rung in zustand; `Particles3D/Rain3D/Clouds3D/GlowMushrooms3D` read it + shed load (55/45/35/25 ladder). (3) no-WebGL2 â†’ static 2D pet+island fallback (`palette.ts` tokens). Port the `FpsDegrader` hysteresis into an r3f hook. **~1wk.**
- [x] **No audio at all** (no dep, zero `AudioContext`). Thin Howler/Web-Audio layer: 1 ambient loop + rain crossfade + 3â€“4 SFX off existing `worldStore` events (`memory.formed`, `pet.levelup`, celebrate, hatch). Mute toggle. Hooks already in `worldStore.connect()`. **~3â€“5d.**

### âš¡ Quick wins (hours each â€” do as ONE batch; biggest feel/perf per effort, low risk)
- [x] `antialias:false` in Canvas `gl` (`World3D.tsx`) â€” MSAA fights the faceted low-poly look + costs frames on integrated GPUs.
- [x] Bloom grade (`Postfx.tsx`): raise `luminanceThreshold` ~0.72â†’**0.9**, `intensity` 0.7â†’**0.4**; add **Vignette + HueSaturation** passes (already in `@react-three/postprocessing`). Single biggest art uplift.
- [x] **Pause-on-blur**: `World3D` `visibilitychange` â†’ `frameloop='demand'` when hidden (stops hidden-tab fan-spin).
- [x] **Canvas ErrorBoundary** around lazy `DenView` + `World3D` (WebGL crash â†’ recoverable, not blank black).
- [x] Pet turn/lean/gaze: `Math.min(1,k*dt)` â†’ `1-Math.exp(-k*dt)` (`Lumenform3D` ~145/147/156) â€” currently **5Ã— too fast at 144Hz**, breaks the "never snappy" rule.
- [x] **Camera-terrain clearance** in `CameraRig` (sample `islandHeight` at camera x/z, push up) â€” camera clips through the island at close zoom.
- [x] **Anticipation gaze** on tool-start (~600ms gaze toward target before moving; flip face to 'working' only on arrival) â€” reads as deciding, not executing.
- [x] Idle RNG: seed from pet DB id, not constant `0x10fc` (`worldStore`) + `lastGesture` anti-repeat â€” kills the identical-every-session idle loop.
- [x] `castShadow=false`/`receiveShadow=false` on transparent meshes (sea, pool surface, XP fill, rain, clouds); tighten shadow frustum Â±22â†’**Â±16** (island radius).
- [x] Derive `Island.tsx` `CLEAR_ZONES` from the place table (remove one duplicate coord copy).

### ðŸŸ  High gaps (1â€“5d each)
- [x] **Toolâ†’place routing.** `worldStore.toWorldEvent()` drops the tool name; every `tool-start` â†’ the single Workbench. Pass `ev.tool` through; add a pure `toolCategoryToPlace()`; add **`garden`/`hollow` to the `Place` type + `ANCHORS`** so the pet can visit its Memory Garden (today structurally impossible â€” `Place` vs `PlaceKind` name mismatch). ~1â€“2d.
- [x] **Wire `petAnim.ts`** (breathâ†’body `scale.y`, head-nod, squash/stretch on hop/land, blink-into-expression swap, per-gesture arm poses). Library is written + tested but mostly **unwired** in `Lumenform3D` (imports only gazeYaw/glow/shadow). Highest alive-payoff for least new code. ~1â€“2d.
- [x] **Drives/mood.** Add `mood`+`energy` to `LumenformState`; work drains, memory/skill events charge; weight `scheduleIdle` by them; weather/time bindings (stormâ†’shelter/nap, fogâ†’slower wander). ~3â€“5d.
- [x] **Milestone screen-space juice.** Level-up swell + celebrate sparkles are sub-pixel at default zoom â€” add FOV punch + brief auto-zoom + a CSS ember flash on `pet.levelup`. (Effects are fine; fix is camera-side.) ~1â€“2d.
- [x] **Robotâ†”world art rhymes** so the robot doesn't read as "dropped into a nature game": data plates near the Workbench, cyan seam on the bench marker (`botEye`), ember rim on the Hollow fire (`botGlow`). ~1â€“2d.

### ðŸ —ï¸  Architecture (deliberate, not under deadline)
- [x] **Single `placeRegistry`.** Collapse the 4â€“5 duplicate place/coord tables (`places.ts` PLACES + NAV_PLACES, `placeDefs.ts` PLACES_3D, `locomotion.ts` ANCHORS, `Island.tsx` CLEAR_ZONES) into one id-keyed registry; reconcile the `Place` vs `PlaceKind` name split. **Decide first whether the 2D `places.ts` path is live or dead.** Prereq for realms. ~1â€“2d.
- [x] **`realmData.ts` + realm system** (per-realm camera bounds, unlock thresholds, place lists) â€” prereq for The Widening (V-6); persist active realm in hydrate. ~3â€“5d.
- [x] **V-3 perf debt** (do IN the V-3 pass): Draco + LOD + cut tree variants on the 18 GLBs (3.4 MB uncompressed now).

### ðŸ•µï¸  Gotchas (don't trip on these)
- The `FpsDegrader` in `world/engine/` is **DEAD** (Pixi) â€” quality-scaling does NOT exist in the live world.
- `Place` vs `PlaceKind` unions use **different names** â†’ compiler can't reconcile; the pet literally cannot route to `garden` today.
- `petPosition.ts` mutable singleton OUTSIDE React is **INTENTIONAL** (zero-alloc camera ground-truth) â€” do NOT "clean it into the store" (reintroduces camera lag).
- Reduced-motion is read **once** at module load â€” toggling the OS mid-session does nothing; needs an in-app toggle.
- `antialias:true` actively fights the intended faceted look.

### Recommended order
1. Finish **V-3** props + its Draco/LOD debt (you're touching `nature/models.ts` anyway). 2. Wire **petAnim** + anticipation gaze (while V-2 is open). 3. **GPU-tier / 2D-fallback** blocker sprint (+ antialias + shadow opt-outs). 4. **Quick-win fundamentals** batch (pause-blur, error boundary, bloom grade) + the World settings panel once the quality store exists. 5. **Camera-feel** polish. 6. **Autonomy depth** (toolâ†’place, mood, weather). 7. **placeRegistry â†’ realms**. **Audio** slots in any time after the hardening sprint.
