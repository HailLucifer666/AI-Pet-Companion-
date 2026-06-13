# AGENTS.md — NeuraClaw entry point for coding agents

> Read this first. Then the doc you need from the table. Don't start a milestone without reading its build-plan entry and the relevant guardrails.

## What this is
NeuraClaw is a **local-first personal AI companion** that lives on your machine: a real agent (FastAPI loop + tools + typed long-term memory + self-drafting skills) wrapped in a flagship workspace, evolving into **"The Mycelium"** — a PixiJS WebGL living world the companion inhabits, where **every visual element maps to real computation** (a crystal = a real memory row, a light-pulse = a real Synapse event). A living dashboard wearing a game's skin. Single SQLite file, local embeddings, Ollama/cloud models behind a role router.

## Docs map
| Doc | Read it for |
|---|---|
| `docs/PRD.md` (v2.0) | Product source of truth — vision, users, the Mycelium, roadmap |
| `docs/WORLD-BIBLE.md` | The world: cosmology, realms, places, pet behavior, interaction laws, weather, cinematics |
| `docs/ARCHITECTURE-WORLD.md` | World engine architecture — module map, store↔engine contracts, hydration, perf ladder |
| `docs/ARCHITECTURE.md` | Backend/app architecture (agent loop, memory pipeline, providers, Synapse, trust tiers) — *write if absent* |
| `docs/BUILD-PLAN-v0.3-WORLD.md` | The W-0…W-8 checkpoint plan with acceptance criteria + commit messages — **the execution roadmap** |
| `docs/ANIMATION-SYSTEM.md` | Motion language, transition grammar, particle budgets, reduced-motion contract (from W-2) |
| `SOUL.md` | The companion's identity template (user-editable, hot-reloaded into the system prompt) |

## Current state (2026-06-13)
- **Shipped + verified:** agent backend, bioluminescent design system (`bf3c80e`), Chat/Memory/Notes/Settings surfaces, **Synapse event bus + ambient Creature (M-0.2b, `194a78b`)**, startup-cycle fix (`236a923`).
- **Baselines (must stay green):** **37 pytest**, **16 vitest**, `tsc -b --noEmit` clean, ruff clean, prod JS bundle **~207 kB gz** (< 300 kB).
- **Next:** W-1 (pet/XP/hatch/ladder backend) per the build plan. Then W-2+ build the world.

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
The user codes from **two machines** and uses **GitHub as the sync point**, pushing before each swap.
- Remote: `github` → `https://github.com/HailLucifer666/AI-Pet-Companion-.git`. Canonical branch: **`master`** (the empty `main` is a stub — do not treat as truth).
- **Every session: `git fetch github` and compare BEFORE building** — the other machine may be ahead. If `github/master` has commits local lacks → fast-forward / rebase onto it; **never force-overwrite** (it can eat the other machine's work).
- **Push `master` to `github` before ending a session / swapping machines.** HTTPS via the logged-in credential manager.

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
