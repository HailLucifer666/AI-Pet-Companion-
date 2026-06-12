# NeuraClaw — Product Requirements Document

**Version:** 1.0 · **Date:** 2026-06-13 · **Owner:** Arghya Chowdhury · **Status:** Approved direction, v0.2 in design

---

## 1. Vision

**NeuraClaw is a creature you hatch, not a tool you install.**

A personal AI companion that lives on your machine: it hatches from an egg knowing your name, learns from every conversation, grows through visible life stages as it works for you, writes its own skills from experience, remembers what matters across months, and reaches out when something needs your attention. Wrapped around it is a full personal workspace — chat, research, notes, tasks, calendar, email — so the creature isn't a gimmick on top of a toy; it's the soul of a real daily-driver product.

**One sentence:** *Tamagotchi soul, principal-engineer brain, flagship-product skin.*

### Why these three parents

| Parent | What we take | What we leave |
|---|---|---|
| **vellum-assistant** (MIT) | Hatch ritual, SOUL identity, structured memory with dedup, proactive check-ins, trust model | Swift/cloud architecture |
| **hermes-agent** (MIT) | Self-improving skills, agent loop + tools, multi-provider freedom, scheduler, subagents | Terminal-first UX |
| **odysseus** (AGPL — *inspiration only, never read its source*) | Self-hosted workspace surface layout: chat / research / documents / notes / tasks / calendar / email / memory | All code |

### Product principles

1. **Alive, not animated.** The creature reacts to real system state (thinking, learning, remembering) — never fake idle theater.
2. **Growth is earned.** XP comes only from genuine work done together. No daily-login farming.
3. **Charm never blocks work.** Every pet feature must be ignorable; the workspace stays a serious tool. No punitive decay, no guilt mechanics.
4. **Local-first, private by default.** One SQLite file, local embeddings, local models supported. Cloud models are opt-in.
5. **The user can see and edit everything the agent believes** — memory browser, soul file, skills — trust through transparency.
6. **Flagship visual quality.** If a screen wouldn't survive a Linear/Raycast screenshot comparison, it isn't done.

---

## 2. Users & success

**Primary user (v1):** Arghya — technical solo operator, Windows 11, runs Ollama locally, wants one assistant that compounds knowledge instead of fifty stateless chats.

**Secondary (v2+):** technically-comfortable individuals who want a private, personal AI with personality; self-hosters.

### Success metrics (30 days post-v0.3)

| Metric | Target |
|---|---|
| Daily sessions with the companion | ≥ 1/day, 5 days/week (real usage, not testing) |
| Memories formed and *kept* (not deleted as junk) | ≥ 30 |
| Agent-authored skills approved by user | ≥ 3 |
| Proactive messages rated useful (not dismissed) | ≥ 50% |
| "Does it feel alive?" gut check | Yes without hesitation |

---

## 3. The Companion System (the differentiator)

### 3.1 Hatch ritual (first run)

First launch shows no dashboard — only a dark void with a faintly glowing, slowly pulsing egg.

Flow (~2 minutes, full-screen, skippable only by closing the app):
1. Egg pulses. Single line: *"Something is waking up."*
2. Five conversational questions, one at a time (typed answers seed `user_profile` + SOUL.md):
   - "What should it call you?"
   - "What will you name it?" (creature name ≠ app name)
   - "How should it speak — direct, warm, playful, formal?"
   - "What do you spend most of your days on?"
   - "What should it never do?" (seeds boundaries)
3. Each answer makes the egg glow brighter / crack further.
4. Final crack animation → creature hatches at Stage 1, greets the user **by name, in the chosen voice**, and stores its first memory: the hatching.
5. Lands in the Den.

Technical: `pet` table row created; SOUL.md regenerated from template + answers; first journal entry written.

### 3.2 The creature

An original vector creature (SVG + CSS/JS animation, no sprite sheets, no licensed IP): an ember-eyed, claw-tailed "neural familiar" whose body is built from layered glowing strokes — reads as alive at 64px and as artwork at 320px.

**Life stages** (silhouette visibly changes each stage):

| Stage | Name | XP | Visual |
|---|---|---|---|
| 0 | Egg | — | Pulsing egg (pre-hatch only) |
| 1 | Hatchling | 0–250 | Small, big eyes, stubby tail |
| 2 | Juvenile | 250–1,000 | Leaner, brighter strokes, tail grows |
| 3 | Adult | 1,000–3,000 | Full silhouette, idle animations richer |
| 4 | Elder | 3,000+ | Larger aura, particle wisps, rare animations |

**Live states** (driven by real system events, priority order): `sleeping` (app idle >30min) → `thinking` (agent loop running) → `working` (tool executing — icon of tool floats near it) → `learning` (memory extraction / skill reflection running) → `celebrating` (level-up, skill approved) → `idle` (breathing, blinking, occasional glance).

### 3.3 Growth: XP + levels (the numbers)

XP awarded **only** for real events, server-side:

| Event | XP |
|---|---|
| Conversation exchange completed | +2 |
| Memory formed (survives dedup + plausibility) | +5 |
| Tool task executed successfully | +3 |
| Note/document created via agent | +5 |
| Skill draft proposed by agent | +10 |
| Skill approved by user | +25 |
| Approved skill reused | +5 |
| Scheduled job completed | +5 |
| Useful proactive message (user engages) | +15 |

Level = stage-relative; level-up triggers `celebrating` + toast. XP history stored in `xp_events` (auditable, drives the Den timeline).

**Anti-farming:** per-day XP cap per event type; no XP for failed tool calls or deleted memories (deletion claws back the +5).

### 3.4 Soul: organic growth (the depth)

- **SOUL.md** — seeded at hatch, user-editable, hot-reloaded into every system prompt.
- **Journal** — nightly scheduled job: creature writes a short first-person reflection on the day's interactions (what it learned, what it got wrong, what the user seems to care about). Visible in the Den; last 3 entries injected into context. This is how personality *drifts* over time — vellum's mechanism, our implementation.
- **Choice memory** — when the user corrects or confirms a behavior ("stop doing X", "yes, always do that"), the agent must store a `preference` memory; preferences are always-injected. The creature "remembers choices."

### 3.5 Mood (light touch)

Derived, never punitive: `radiant` (recent level-up / streak of successful work) · `content` (default) · `curious` (new project detected in memories) · `drowsy` (no interaction 3+ days — expressed as sleepy art, **never** guilt text). Mood tints idle animation + one line in the Den. No hunger, no death, no nagging.

### 3.6 Den (home surface, replaces bare /chat as landing)

Layout: creature stage front-center (large, animated, reacts to cursor) · name + stage + XP ring · mood line · "what I did while you were away" digest (job runs, memories formed, drafts proposed) · latest journal entry · quick actions (talk, review skill drafts, see memories) · streak/“days alive” counter.

### 3.7 Ambient presence

Small live creature widget (≈40px) in the rail bottom on every surface — mirrors live state (thinking/working/learning). Click → jumps to Den. During chat streaming, the creature in the rail visibly "thinks."

---

## 4. Capability pillars (Hermes brain)

Already shipped (v0.1, verified live):
- **Agent loop** — plan → tool calls → respond, streaming SSE, step budget, audit log
- **Tools** — workspace files, shell (trust-gated), web search/fetch, history search, notes, memory CRUD
- **Memory engine** — typed memories (identity/preference/project/event/fact), local embeddings (fastembed), hybrid retrieval (sqlite-vec KNN + FTS5 BM25 + RRF), LLM extraction with dedup + plausibility gate
- **Provider freedom** — NIM / OpenRouter / Ollama behind role router (primary/cheap/local) with failover; tool-capability guard
- **Trust tiers** — READ < WRITE < EXECUTE < NETWORK_SENSITIVE; auto-allow threshold in config

Built, uncommitted (finish in v0.3):
- **Self-improving skills** — agent reflects post-task, drafts SKILL.md playbooks → user approves → versioned, reusable via `use_skill`
- **Scheduler** — cron jobs, headless agent tasks, nightly journal job, hourly proactive heartbeat (cheap-model gate, code-enforced rate limit + quiet hours)
- **Approvals** — high-risk tool calls pause for user approve/deny (web UI now, Telegram later)

Later: Telegram gateway · subagents · MCP client · deep research runs.

---

## 5. Workspace surfaces (Odysseus layout)

Left rail (creature widget bottom), surfaces in order:
**Den** (home) · **Chat** · **Research** · **Documents** · **Notes** · **Tasks** · **Calendar** · **Email** · **Memory** · **Skills** · **Settings**

Shipped: Chat, Memory, Notes, Settings (functional, visuals below bar). Stubs: Research, Documents, Tasks, Calendar, Email, Skills.

---

## 6. UI/UX requirements (the "multi-million-dollar" bar)

Current UI verdict (screenshot audit, 2026-06-13): functionally clean, visually generic — flat surfaces, no depth, no motion, naked OS dropdowns, template empty states. **Full visual overhaul is a v0.2 blocker, not polish.**

### Direction: **"Bioluminescent terminal"**
A dark instrument panel that something alive inhabits. Deep layered surfaces with subtle radial atmosphere; one living accent (ember/amber, the creature's color) that *means* the creature — accent glow intensity literally tracks agent activity. Display font with personality for moments (hatch, level-up, Den), disciplined UI sans everywhere else.

### Hard requirements
1. Layered elevation system (page → raised → overlay) with inner-highlight borders + soft shadows — no flat single-plane screens
2. Motion system: 150/300/500ms tokens, ease-out-expo; every interactive element has designed hover/focus/active; list mount stagger; route crossfade; streaming text cursor shimmer
3. Custom select/popover/dialog/toast primitives (Radix unstyled under the hood) — **zero** native OS controls visible
4. Designed empty states per surface (creature-themed illustration + one action), no icon+text templates
5. Skeleton loaders, optimistic updates, undo toasts (no instant silent deletes)
6. SPA deep-link fallback (fixed), favicon + app title, keyboard map (Ctrl+K palette in v0.3)
7. WCAG 2.2 AA: contrast, focus-visible, reduced-motion honors `prefers-reduced-motion` (creature falls back to static art)
8. Every shipped surface screenshot-tested at 1280/768 widths against the styleguide

Reference quality bar: Linear, Raycast, Arc. Reference soul: Tamagotchi, Finch, Duolingo's character energy — **without** their nagging.

---

## 7. Roadmap (resequenced 2026-06-13: companion + skin before reach)

| Version | Name | Contents | Exit test |
|---|---|---|---|
| v0.1 ✅ | Brain | Agent loop, memory, tools, provider router, basic 4 surfaces | Live agent turn via Ollama — passed |
| **v0.2** | **Soul + Skin** | Design-system overhaul (tokens, primitives, motion), hatch ritual, creature (4 stages + live states), Den, ambient widget, XP engine + events, mood, SPA/favicon fixes, custom controls | Fresh install → hatch → chat → creature visibly reacts + gains XP; UI survives screenshot test |
| v0.3 | Growth | Skills system (finish: reflector + approval UI), scheduler + nightly journal + proactive heartbeat, Ctrl+K palette, toasts/skeletons everywhere | Agent drafts skill from real task → approve in UI → reused next session; journal appears in Den |
| v0.4 | Reach | Telegram gateway (allowlist, streaming, approval buttons), approvals end-to-end, notifications | Round-trip Telegram chat + approve EXECUTE from phone |
| v0.5 | Workspace | Documents (multi-tab editor + AI assist), Tasks + Calendar, Research runs with cited reports | "Remind me Friday" → calendar; research query → clickable citations |
| v0.6 | Comms | Email triage (IMAP/SMTP, AI tags, drafts), MCP client | Seeded inbox tagged correctly; AI draft sent to self |

## 8. Out of scope (v1)

Multi-user/auth · mobile apps · cloud sync · voice · marketplace/sharing of skills · Docker · payments · model fine-tuning · 3D creature.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Pet reads as cringe to a serious user | Principle 3: ignorable; mood/XP never block or nag; Den is one surface among ten |
| Creature art quality ceiling (no artist) | Vector + motion design > illustration skill; stage silhouettes simple; iterate in styleguide |
| XP farming makes growth meaningless | Server-side awards only, daily caps, claw-backs |
| Small local models pollute soul/journal | Plausibility gates (shipped for memory); journal uses primary role when available |
| AGPL contamination from odysseus | Layout inspiration from screenshots only — repo never opened |
| Scope explosion (pet + workspace + agent) | Strict version gates above; each version independently shippable |

## 10. Open questions

1. Creature art: single species evolving, or hatch-time variation (color tint from personality answers)? — *default: one species, personality-tinted accent*
2. Journal model: spend primary-role tokens nightly, or cheap-role with quality gate? — *default: primary if key present, else skip night*
3. XP visible everywhere or Den-only? — *default: Den + level-up toast only*

---

*Implementation reference: see `C:\Users\Arghya Chowdhury\.claude\plans\i-am-looking-to-virtual-manatee.md` (architecture) — superseded where this PRD conflicts. Repo: `D:\NeuraClaw v1`.*
