# NeuraClaw — THE MYCELIUM · Roadmap & Status Tree

> *A local-first AI companion that lives in a 3D low-poly world and visualizes only real computation.*
> Living status doc — updated each slice. Source of truth for plan detail: the master plan in `.claude/plans/`.
> **Last updated:** 2026-06-15 · **Branch / sync point:** GitHub `master` (`efb772b`) · **Current:** V-2.5, V-2h, W-7 Widening core, **W-8 complete**, **W-6 Quickening + 3D egg / dawn burst-flash** shipped. The headline beats all land — remaining work is polish + the V-4 milestone.
>
> **🖥️↔💻 Two-machine sync:** this file + `git log` are the portable memory (the `.claude/plans/` master plan is machine-local). **Sit down → `pull.bat` (or `git pull --rebase`) FIRST. Leave → commit + push.** Never switch machines with unpushed work. See AGENTS.md § Two-machine sync.

---

## 1 · Where we are (one line)
The 3D world is a living **bioluminescent medieval village**: a screen-faced robot pet rests at a plaza hearth and walks cobble roads to the forge/greenhouse on real events — real day/night + weather, visible sun & moon, a decluttered low-poly grove, voice chat, and a reactive core (Spore Gate fills/blooms with real XP, mycelium pulses, memory crystals + Mind's Eye web). Cinematics: the **Blooming** (level-up) + the **Forging** (skill draft) land as real-data moments. **Next:** the Quickening (in-world hatch) + V-2.5 hardening.

---

## 2 · Status at a glance

| State | Meaning |
|-------|---------|
| ✅ | Shipped to `github/master`, verified |
| 🔨 | In progress (this slice) |
| ⏳ | Pending |
| Effort | **S** ≈ hours · **M** ≈ a day · **L** ≈ multi-day |

### Done ✅
| Slice | What | Commit |
|-------|------|--------|
| W-0…W-5 | Synapse event bus, ambient creature, hatch ritual, XP engine + growth ladder, Lumenform FSM, Places/diegetic nav, memory crystals | (pre-pivot) |
| 3D pivot 1–4 | react-three-fiber world: island, pet, crystals, places as overlays | `c821f36` |
| V-1a / V-1b | Pet roams (pure `locomotion.ts`); bigger fuller island, instanced forest, pool | `c821f36` |
| V-2a/b/d | Follow camera, opened grove (no tree wall), ambient particles + bloom | `a2d857f` |
| V-2c | Sky + real local-clock day/night + real weather by IP (rain/clouds/storm) | `ebab910` |
| V-2a′ / V-2a″ | Fluid eased zoom + drone-follow; map-drag pan (left=pan, right=rotate) + auto re-follow | `a2e668d`/`8ff660b` |
| V-2f / f′ | Tight follow + activity emoji bubble; cursor-lure (pet follows your cursor) | `2230537` |
| V-2e | **Reactive core** — Spore Gate fills/blooms with real XP, mycelium pulses on tool/memory/skill, crystal sprout-flash | `2c79d2e`-era |
| V-2-ART | Bioluminescent art pass — ACES tonemapping, crystalline pet, glow grade, selective bloom | `3d0c499`/`2f35d76` |
| Den HUD | live clock + real weather + city chip | `d164b3e` |
| V-2g / V-2i | Living Memory Web (embedding-linked crystals + Ebbinghaus compost) + Mind's Eye graph (press **M**) | `7bc12e2`/`9902cb7` |
| PIVOT | Land on `/den` + Grove tab · memory threads off-island · glass pet-chat (real `/api/chat` stream + voice STT/TTS + in-world speech) | `d9a8c45` |
| PIVOT-2 / 2b | Instanced Quaternius GLB trees/rocks/bushes (CC0) replace procedural scatter | `fd2fa52`/`0d9c406` |
| V-2-BOT | Screen-faced **robot pet** + data-driven expression face | `52238b9` |
| GROW | Visible **sun + moon** · grow world ×7 · explorable follow-camera | `64b8913`/`cbad18d` |
| GROW-2 | Right-size ×5 · **bioluminescent village** (plaza/hearth, 3 buildings, cobble roads, pet road-pathing) · sun/moon visible | `3d1c0b1`/`25aa185` |
| Eyeball fixes | Flatten island · lit roads · flat plaza pad · warm campfire + props · declutter + cleaner night · **free-roam toggle** · pet walks to Memory Garden on a formed memory | `5e28a84`→`0539780` |
| W-6 Blooming | cubic-out level-up gate flash + inbound pulse (pure tested core `bloomCinematic.ts`) | `1819d9b` |
| W-6 Forging | skill draft → **forge erupts** + pet celebrates at the Foundry | `a12dfd1` |
| V-2.5 (part) | **GPU-tier quality ladder** (`quality.ts`, pure-tested — drops bloom/MSAA/shadows/extra-lights/dpr first on weak GPUs) + **2D no-WebGL fallback** | `2de142d` |
| V-2h (part) | **Emotion vector** (`emotion.ts`, pure-tested) — real agent cadence → {arousal,valence,curiosity,confidence} colours the pet's glow (brighter when busy, warmer on a real win) | `2b161e8` |
| W-8 (part) | **Clickable memory crystals** — click a crystal → a glass panel shows the real memory (type/content/age/confidence) from the cached list | `16ec055` |
| W-8 (part) | **Skill monuments** — approved (active) skills raise glowing obelisks ringing the forge (`GET /api/skills` + `skill.approved` event + pure-tested placement); earned, real-data only | `072457c` |
| W-8 (part) | **Daily greeting** — on Den entry the pet speaks a line built from the real `/api/den` digest (memories/skills/XP-today) in its 3-D bubble (`greeting.ts` pure-tested) | `1c4c412` |
| W-8 (play) | **Fetch play** — throw a spark, the pet dashes out + carries it home (`fetchPlay.ts` pure-tested); zero-XP charm, work always wins. **W-8 complete** | `6397571` |
| V-2h (HUD) | **Mood word** — one real emotion source (worldStore tick) drives the glow + a named mood in the Coil HUD (`moodWord` pure-tested) | `5babd12` |
| W-6 Quickening | **In-world first-run cinematic** — dark grove → questions warm the sky → first dawn at hatch (`quickeningRamp` pure-tested, dedicated backdrop, ErrorBoundary). Layered over HatchRitual; onboarding never breaks (no-WebGL/reduced/error all fall back) | `5ce4315` |
| W-7 (core) | **The Widening** (`widening.ts`, pure-tested) — real `pet.stage` widens the camera survey range + horizon fog per stage + a warm stage-up flash | `7fb90cd` |
| W-6 polish | **3D egg in the Quickening** (glowing ovoid in the dark grove — warms per question, hot-bursts at hatch, vanishes on reveal) + **dawn burst-flash** (cubic-out gold veil at the hatch moment via `bloomFlash`, both modes); 2D egg suppressed in cinematic; reduced-motion calm | `efb772b` |

### In progress 🔨
_(none — at a clean checkpoint; pick the next from Pending)_

### Pending ⏳
| Slice | What | Effort |
|-------|------|--------|
| W-6 polish (rest) | Quickening laterCuts — per-region light bursts · camera dolly during questions · emergence particles · soft sound (first cut `5ce4315`; 3D egg + dawn burst-flash done `efb772b`) | **M** |
| V-2.5 (rest) | placeRegistry consolidation (one source for place coords/anchors/road-nodes) — deferred: high test-churn, invisible; the robustness wins (GPU ladder + 2D fallback) already shipped | **S** |
| V-3 | GLB prop/pet polish — KayKit/Kenney village GLBs + unified Draco/LOD sweep | **L** |
| V-2h (rest) | Backend `mood` column — **deferred by design**: the frontend is the live richer deriver (glow `2b161e8` + HUD word `5babd12`); nothing server-side consumes mood, so a client-write adds surface for no gain | **S** |
| W-7 (rest) | Separate realms II (Wilderness) + III (Observatory) — **needs a design rethink post-village-pivot** (workflow-sized); the stage-up world-reveal core shipped `7fb90cd` | **L** |
| V-4 | Sight & Voice — browser teaching → Tauri native shell + desktop pointing (see `docs/SIGHT-AND-VOICE.md`) | **XL** |
| Beyond | Scheduler/journal · Telegram + approvals · Documents/Tasks/Calendar/Email Places · MCP | **L+** |

---

## 3 · The flow (how every new feature is born)

Each idea walks the same 4-stage gate before it ships. New features **branch off the trunk** — never bolt onto a shaky base.

```
                          ┌─────────────────────────────────────────────┐
                          │  ① FRESH IDEA  (OG codebase / the trunk)      │
                          │     "wouldn't it be amazing if the world…"    │
                          └───────────────────┬─────────────────────────┘
                                              │
                                              ▼
                          ┌─────────────────────────────────────────────┐
                          │  ② SUB-BRANCH: REALITY CHECK                  │
                          │   • does it run in THIS repo / engine?        │
                          │   • real data only? (no faked signals)        │
                          │   • bundle budget? perf? a11y / reduced-motion?│
                          │   • MIT-only deps? fits the spine?            │
                          └─────────┬───────────────────────┬────────────┘
                                    │                        │
                          negative  │                        │ positive
                          (park it)  ▼                        ▼
                    ┌──────────────────────┐   ┌─────────────────────────────────────┐
                    │  ✗ shelve / rework    │   │  ③ ENDLESS-POSSIBILITY BRANCH          │
                    │  note why, revisit    │   │   scope the slice, pick the smallest   │
                    │  when the base grows  │   │   real-data version, design the cores  │
                    └──────────────────────┘   └──────────────────┬────────────────────┘
                                                                   │
                                                                   ▼
                                                 ┌─────────────────────────────────────┐
                                                 │  ④ CONTINUE                            │
                                                 │   build → tsc + tests + budget → live  │
                                                 │   verify → commit → push master →      │
                                                 │   merge back to trunk → next idea      │
                                                 └─────────────────────────────────────┘
```

**Rule of the trunk:** a slice only merges back (stage ④) once it's green + live-verified. The trunk stays always-shippable, so the next fresh idea branches off solid ground.

---

## 4 · Feature tree (trunk → branches)

```
NeuraClaw (trunk: local-first AI companion, real computation only)
│
├── ✅ NERVOUS SYSTEM ......... Synapse event bus (SSE), agent loop, typed memory, self-drafting skills
│
├── ✅ GROWTH ................. hatch ritual · XP engine · capability ladder (gates by stage)
│
├── ✅ THE WORLD (3D) ......... react-three-fiber bioluminescent village
│   ├── ✅ island · crystals · Places-as-overlays
│   ├── ✅ screen-faced ROBOT pet (data-driven face) · roams via pure locomotion
│   ├── ✅ bioluminescent VILLAGE — plaza/hearth + tavern/forge/greenhouse + cobble roads (pet road-pathing)
│   ├── ✅ open decluttered grove (instanced CC0 GLB trees/rocks/bushes) + ambient particles + bloom
│   ├── ✅ real day/night (local clock) + real weather (IP → Open-Meteo) + visible sun & moon
│   ├── ✅ camera: fluid zoom · drone-follow · map-drag pan · auto re-follow
│   └── ✅ V-2f: tight follow + activity emoji bubble (🔧😴🌱🎉👀🚶🎲) + cursor-lure + free-roam toggle
│
├── ✅ REACTIVE CORE (V-2e) ... the payoff — world visibly = real work
│   ├── ✅ Spore Gate fills with real XP, blooms on levelup (cubic-out)
│   ├── ✅ mycelium pulses travel origin→pet→Gate on tool-runs / memories / skills
│   ├── ✅ crystal sprout-flash on memory.formed · fold-back on forget · Mind's Eye web (press M)
│   └── ✅ forge erupts on skill draft · pet walks to the Memory Garden on a formed memory
│
├── ⏳ 2050 ELEVATIONS ........ council-synthesized, gated by reality-check (see docs/COUNCIL-SYNTHESIS.md)
│   ├── ⏳ V-2g Living Memory Web (L) — crystals placed/linked by embedding similarity + Ebbinghaus compost   [REAL-NOW]
│   ├── ⏳ V-2h Emotion Vector (M) — arousal/valence/curiosity/confidence from real agent cadence → pet glow  [REAL-WITH-WORK]
│   ├── ⏳ V-2i Mind's Eye (L) — zoom into the real memory graph: cosine edges, confidence brightness, live-retrieval spotlight  [REAL-NOW subset]
│   └── ⏳ B-1+W-8 Diegetic streaming chat (M) — token.stream on the bus → pet speaks the reply in a 3D bubble  [REAL-WITH-WORK]
│
├── ⏳ SIGHT & VOICE (V-4) .... the Teaching Buddy — clicky-inspired (see docs/SIGHT-AND-VOICE.md)
│   ├── ⏳ V-4a Multimodal teaching (M) — getDisplayMedia screenshot → vision brain → pet explains  [REAL-WITH-WORK · browser]
│   ├── ⏳ V-4b Voice (M) — speechSynthesis TTS + push-to-talk Web Speech STT  [REAL · browser]
│   ├── ⏳ V-4c Tauri shell (L) — native wrap: global hotkey + OS screen capture + local Whisper STT  [REAL · native]
│   ├── ⏳ V-4d Desktop pointing (L) — [POINT:x,y] → transparent click-through overlay, animated pet-cursor  [REAL · native]
│   └── ⚠️ privacy: hosted vision brain = screenshot leaves device → opt-in only, never persisted, UI warns; local Ollama-vision option
│
├── 🔨 THE PET, FOR REAL (V-3)  ✅ robot pet shipped (V-2-BOT) · ⏳ GLB prop/pet polish + Draco/LOD
│
├── 🔨 THE MOMENTS (W-6) ...... ✅ Blooming · ✅ Forging · ✅ Coil XP HUD · ⏳ the Quickening (in-world hatch)
│
├── ⏳ THE WIDENING (W-7) ..... realm II Wilderness · realm III Observatory (unlock on stage-up)
│
├── ⏳ FULL GAME (W-8) ........ diegetic chat at the Hollow · clickable memory crystals · skill monuments · play
│
└── ⏳ BEYOND ................. scheduler/journal · Telegram + approvals · Docs/Tasks/Calendar/Email · MCP
```

---

## 5 · Rough horizon (effort, not promises)
- **Now → short:** V-2f (S, this slice) → **V-2e reactive core (L)** — the slice that makes the whole concept *land*.
- **Mid:** V-3 pet body (L) + W-6 cinematics/HUD (L) — the world starts to feel authored, not just simulated.
- **Long:** W-7 realms (L) + W-8 full game (L) — the world widens as the pet grows.
- **Beyond:** integrations + autonomy (L+) — only after the core loop is undeniable.

No hard dates — each branch ships when it's green and live-verified. The trunk is always runnable: `start.bat` → http://127.0.0.1:8090 → `/den`.

---

## 6 · Rejected / Deferred ledger (so we don't re-chase)
Run through the reality-check gate in `docs/COUNCIL-SYNTHESIS.md`:
- **❌ Rejected (no real signal today):** attention-head / reasoning-chain viz (hosted APIs expose no attention/logprobs) · multi-modal emotion (webcam HRV / voice / biometric — no sensors, privacy) · quantum / neuromorphic / BCI / "consciousness metrics" (theater).
- **⏸ Deferred (legit, later):** MCP-first architecture (large, nothing today) · biome-morph by cognitive domain (needs context classification — revisit after the memory web).
- **Stack canon:** world stack is **React + Vite + Three.js/R3F**; the old W-2 "PixiJS" plan text is superseded by the V-2 3D pivot.
