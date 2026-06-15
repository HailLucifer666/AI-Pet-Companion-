# AGENTS.md — NeuraClaw entry point for coding agents

> Read this first. Then the doc you need from the table. Don't start a milestone without reading its build-plan entry and the relevant guardrails.

## What this is
NeuraClaw is a **local-first personal AI companion** that lives on your machine: a real agent (FastAPI loop + tools + typed long-term memory + self-drafting skills) wrapped in a flagship workspace, evolving into **"The Mycelium"** — a PixiJS WebGL living world the companion inhabits, where **every visual element maps to real computation** (a crystal = a real memory row, a light-pulse = a real Synapse event). A living dashboard wearing a game's skin. Single SQLite file, local embeddings, Ollama/cloud models behind a role router.

## Docs map
| Doc | Read it for |
|---|---|
| **`docs/ROADMAP.md`** | **READ FIRST — live status (current version), the V-2.5 hardening track, and what to work on next. Cross-app source of truth.** |
| **`docs/WORLD-VILLAGE.md`** | **The locked WORLD DIRECTION — build-ready Bioluminescent Medieval Village spec (data model, road pathing, place→building, assets+lighting, file-by-file build order). Read before touching the world.** |
| `docs/PRD.md` (v2.0) | Product source of truth — vision, users, the Mycelium, roadmap |
| `docs/WORLD-BIBLE.md` | The world: cosmology, realms, places, pet behavior, interaction laws, weather, cinematics |
| `docs/ARCHITECTURE-WORLD.md` | World engine architecture — module map, store↔engine contracts, hydration, perf ladder |
| `docs/ARCHITECTURE.md` | Backend/app architecture (agent loop, memory pipeline, providers, Synapse, trust tiers) — *write if absent* |
| `docs/BUILD-PLAN-v0.3-WORLD.md` | The W-0…W-8 checkpoint plan with acceptance criteria + commit messages — **the execution roadmap** |
| `docs/ANIMATION-SYSTEM.md` | Motion language, transition grammar, particle budgets, reduced-motion contract (from W-2) |
| `SOUL.md` | The companion's identity template (user-editable, hot-reloaded into the system prompt) |

## Current state (2026-06-15) — **see `ROADMAP.md` (repo root) for the live version + next work**
- **Version ≈ V-4a.** The 3D world is a living **bioluminescent medieval village**: a robot pet rests at a plaza hearth and walks cobble roads to the forge/greenhouse on real events; real day/night + weather + visible sun & moon; reactive core (XP gate fills/blooms, mycelium pulses, memory crystals + Mind's Eye web); voice chat. **Shipped since W-6 Forging:** the **Quickening** (in-world hatch cinematic), **W-7 Widening** core, **W-8** (clickable memory crystals · skill monuments · daily greeting · fetch play), **V-2.5** (GPU-tier quality ladder + 2D no-WebGL fallback), **V-2h** (emotion glow + HUD mood word), **V-4a Sight** (multimodal chat + `/api/vision` + screen-capture UI), and **in-app model selection** (live discovery + per-turn model override).
- **World engine = react-three-fiber + three** (`frontend/src/world3d/`). PixiJS mentions in older docs are **superseded** — `frontend/src/world/` is legacy/dead except `crystalSeed.ts` + `LumenformFSM.ts` (reused).
- **Baselines (must stay green):** pytest green (**98**), **237 vitest**, `tsc --noEmit` clean, `npm run build` passes, world chunk **≤350 kB gz** (currently ~312).
- **Next:** V-4 rest (voice in/out polish, Tauri native shell + desktop pointing — see `docs/SIGHT-AND-VOICE.md`), placeRegistry consolidation, V-3 GLB prop/pet polish, and separate W-7 realms II/III (needs a post-village design rethink). Latest tip: `a8de26d`.

## Run & verify (Windows / PowerShell; Bash tool also available)
```
INSTALL.bat                      # venv + pip install -e .[dev] + smoke test + frontend build
START.bat                        # serves http://127.0.0.1:8090  (python -m neuraclaw)
.\.venv\Scripts\python.exe -m pytest -q          # backend: expect 37 passed
cd frontend && npm run lint && npm run test && npm run build   # tsc / vitest 16 / build
cd frontend && npm run dev       # Vite dev :5173, proxies /api -> :8090 (DEV-only routes: /styleguide)
```
Health: `GET http://127.0.0.1:8090/api/health` → `{"status":"ok","version":"3.0.0a0","sqlite_vec":"..."}`.
Live event bus: `curl -N http://127.0.0.1:8090/api/events` (heartbeat `: hb` every 25s; live events while the agent works).

## Git — two-machine workflow (IMPORTANT)
The user develops on **two machines at different times** (laptop ↔ desktop) and must **continue exactly where they left off**. **GitHub `master` is the single source of truth**, pushed before each swap.
- Remote: `github` → `https://github.com/HailLucifer666/AI-Pet-Companion-.git`. Canonical branch: **`master`** (the empty `main` is a stub — do not treat as truth). `master` tracks `github/master`, so plain `git pull --rebase` / `git push` work. A fresh clone has `origin` = GitHub (same commands).
- **At session start — PULL FIRST, before any work:** run **`pull.bat`** (= `git pull --rebase` + shows recent `git log` + ROADMAP head). The other machine may be ahead.
- **As you work:** commit per logical slice (conventional messages = the changelog) and **push promptly** — **`ship.bat "type(scope): message"`** (= `git add -A` + commit + `pull --rebase` + push). Never leave a machine with uncommitted/unpushed work.
- If `pull --rebase` reports divergence, reconcile (rebase/merge) — **never force-overwrite** (it can eat the other machine's work).
- **Portable memory = this file + `ROADMAP.md` + `git log`.** The detailed master plan in `~/.claude/plans/` is **machine-local and does NOT sync** — do not rely on it across machines. **Keep `ROADMAP.md` current as you ship** so the *other* machine (and its AI) sees the latest progress.
- Not synced via git (set up once per machine, never committed): `.env` (keys, from `.env.example`), `config.yaml` (from `config.example.yaml`), `data/` (pet DB — fresh per machine during dev). `node_modules`/`.venv`/`dist` are regenerated by `INSTALL.bat`.

## Guardrails (binding — violating these fails review)
- **MIT-only dependencies.** Never open or read the `odysseus` source (AGPL) — layout inspiration from screenshots only.
- **Tokens-only color.** No hardcoded colors anywhere — UI uses CSS vars from `frontend/src/styles/theme.css`; the Pixi world reads those vars at init via the TokenBridge.
- **Server-side XP only**, with daily caps + claw-backs. **Zero XP from affection/play.** No decay, no guilt, no nagging.
- **The world renders only real data.** Every crystal/pulse/bloom is a real DB row or Synapse event — no fake theater.
- **Synapse payload keys must never be `type`** (it shadows the event type in the SSE JSON). Memory type travels as `memory_type`.
- **Accessibility:** WCAG 2.2 AA. Full `prefers-reduced-motion` fallback ("static-but-alive" — all real info preserved, only in-betweening removed). Keyboard parity for every interaction. Zero native OS controls (Radix primitives in `components/ui.tsx`).
- **Perf:** main bundle ≤ 300 kB gz; lazy world chunk ≤ 350 kB gz; 60fps target with a degrade ladder; ticker stops on hidden tab.
- **Checkpoint discipline:** build → verify → commit, never two checkpoints in flight. Conventional commits. **Done = tests green + live verify + screenshot bar** ("would it survive next to Linear/Raycast — or a Supercell game?").
- **Verify, don't trust:** run the app, not just the tests. (M-0.2b passed tests but crashed at startup on a circular import — caught only by launching it.)

## Stack (pinned — see `frontend/package.json`, `pyproject.toml`)
Backend: Python ≥3.11, FastAPI, aiosqlite + sqlite-vec + FTS5, fastembed (BAAI/bge-small-en-v1.5, dim 384), OpenAI-compat provider layer (NIM / OpenRouter / Ollama) behind a role router. Frontend: React 18 + Vite 5 + TS strict, Tailwind v4 (`@theme` tokens), Radix primitives, `motion` (framer-motion), @tanstack/react-query, zustand. World (from W-2): `pixi.js` v8 (MIT), lazy-loaded.
