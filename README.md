# NeuraClaw V3

Personal AI workspace + autonomous agent platform. Local-first, Windows-friendly, single process.

Combines three ideas:
- **Structured long-term memory** with proactive check-ins (vellum-assistant style)
- **Self-improving skills** — the agent writes and refines its own skill files (hermes-agent style)
- **A full workspace UI** — chat, research, documents, notes, tasks, calendar, email (odysseus style, clean-room)

Now evolving into **The Mycelium** — a PixiJS living world the companion inhabits, where every crystal is a real memory and every light-pulse a real event.

## Docs
| Doc | What |
|---|---|
| [AGENTS.md](AGENTS.md) | **Start here** — agent entry point, run/verify, guardrails, two-machine git sync |
| [docs/PRD.md](docs/PRD.md) | Product source of truth (v2.0 — The Mycelium) |
| [docs/WORLD-BIBLE.md](docs/WORLD-BIBLE.md) | The world: cosmology, realms, pet behavior, interaction laws, cinematics |
| [docs/ARCHITECTURE-WORLD.md](docs/ARCHITECTURE-WORLD.md) | World engine architecture, contracts, perf, a11y |
| [docs/BUILD-PLAN-v0.3-WORLD.md](docs/BUILD-PLAN-v0.3-WORLD.md) | The W-0…W-8 checkpoint roadmap |
| [SOUL.md](SOUL.md) | The companion's identity template |

## Quick start

1. `INSTALL.bat` — creates venv, installs deps, runs smoke tests, builds frontend
2. Edit `.env` — add your `NVIDIA_API_KEY` (free at https://build.nvidia.com) and/or `OPENROUTER_API_KEY`
3. `START.bat` — opens http://127.0.0.1:8090

Local models: install [Ollama](https://ollama.com), pull a model, it's already wired in `config.yaml` under the `local` role.

## Stack

- Backend: Python 3.11+, FastAPI, SQLite (WAL) + sqlite-vec + FTS5, hand-rolled OpenAI-compatible provider layer (NIM / OpenRouter / Ollama)
- Frontend: React + Vite + TypeScript + Tailwind, served as static files by the backend

## Development

```
.venv\Scripts\activate
pytest                      # backend tests
cd frontend && npm run dev  # Vite dev server on 5173, proxies /api to 8090
```

## License

MIT
