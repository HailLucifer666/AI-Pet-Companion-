# NeuraClaw — THE MYCELIUM · Roadmap & Status Tree

> *A local-first AI companion that lives in a 3D low-poly world and visualizes only real computation.*
> Living status doc — updated each slice. Source of truth for plan detail: the master plan in `.claude/plans/`.
> **Last updated:** 2026-06-14 · **Branch / sync point:** GitHub `master` (`8ff660b`) · **Current slice:** V-2f.

---

## 1 · Where we are (one line)
The 3D world is alive — pet roams an open grove, real day/night + real weather, ambient life, a fluid drone camera. **Next big unlock:** the reactive core (V-2e) — making XP / memories / tool-runs visibly drive the world. Then the pet gets a real body (V-3).

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
| V-2a′ | Fluid eased zoom + autonomous drone-follow | `a2e668d` |
| V-2a″ | Map-drag pan (left=pan, right=rotate, scroll=zoom) + auto re-follow | `8ff660b` |

### In progress 🔨
| Slice | What | Effort |
|-------|------|--------|
| **V-2f** | Tighter auto-follow (centered, fast re-lock) + activity emoji bubble above pet's head + this ROADMAP | **S** |

### Pending ⏳
| Slice | What | Effort |
|-------|------|--------|
| V-2e | **Reactive core** — XP into store, Spore Gate fills with real XP, mycelium pulses on tool-runs, crystal flash on memory.formed, fire flares while working | **L** |
| V-3 | Pet **character form** — replace the icosahedron blob with a real low-poly creature, per-stage growth | **L** |
| W-6 | Cinematics + HUD — The Quickening (in-world hatch), Blooming (levelup), Forging (skill), Coil XP ring | **L** |
| W-7 | The Widening — realms II (Wilderness) + III (Observatory), camera bounds expand on stage-up | **L** |
| W-8 | Full-game layer — diegetic chat at the Hollow, clickable crystals open real memories, skill monuments, play | **L** |
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
├── ✅ THE WORLD (3D) ......... react-three-fiber grove
│   ├── ✅ island · pet · crystals · Places-as-overlays
│   ├── ✅ roaming pet (pure locomotion)
│   ├── ✅ open grove (no tree wall) + ambient particles + bloom
│   ├── ✅ real day/night (local clock) + real weather (IP → Open-Meteo)
│   ├── ✅ camera: fluid zoom · drone-follow · map-drag pan · auto re-follow
│   └── 🔨 V-2f: tight follow + activity emoji bubble (🔧😴🌱🎉👀🚶🎲)
│
├── ⏳ REACTIVE CORE (V-2e) ... the payoff — world visibly = real work
│   ├── ⏳ Spore Gate fills with real XP, blooms on levelup
│   ├── ⏳ mycelium pulses travel origin→pet→Gate on tool-runs / memories / skills
│   ├── ⏳ crystal flash on memory.formed · fold-back on forget
│   └── ⏳ Hollow fire flares while a tool runs
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
├── ⏳ THE PET, FOR REAL (V-3)  low-poly character form, per-stage body
│
├── ⏳ THE MOMENTS (W-6) ...... cinematics (Quickening / Blooming / Forging) + Coil XP HUD
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
