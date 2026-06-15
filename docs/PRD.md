# AI Pet Companion â€” Product Requirements Document

**Version:** 2.0 Â· **Date:** 2026-06-13 Â· **Owner:** Arghya Chowdhury Â· **Status:** Approved direction â€” M-0.2b shipped; building The Mycelium (v0.3, world-first)

---

> ## âŸ¡ v2.0 â€” THE MYCELIUM (supersedes where it conflicts below)
> The companion no longer lives on a `/den` card â€” it lives **inside a world**. The pet is hatched into **The Mycelium**: a PixiJS WebGL living world that grows as the pet grows, where **every visual element maps to real computation** (a crystal = a real memory row, a light-pulse = a real Synapse event, light = XP). One continuous world across three altitudes â€” the Bioluminescent Grove â†’ the Digital Wilderness â†’ the Observatory â€” that the camera *expands* through as the pet reaches new stages. Productivity surfaces (Chat/Memory/Notes/â€¦) become **Places** in the world and open as overlay panes; the rail stays the fast path.
>
> **This reframes Â§3.6 (Den) â†’ the world, and re-points Â§7 (Roadmap) â†’ the W-0â€¦W-8 plan.** Full spec: [WORLD-BIBLE.md](WORLD-BIBLE.md) Â· [ARCHITECTURE-WORLD.md](ARCHITECTURE-WORLD.md) Â· [BUILD-PLAN-v0.3-WORLD.md](BUILD-PLAN-v0.3-WORLD.md). Binding principles unchanged: growth is earned (zero XP from affection/play), charm never blocks work, local-first, render only real data, flagship visual quality.

## 1. Vision

**AI Pet Companion is a creature you hatch, not a tool you install â€” and it lives in a world you tend together.**

A personal AI companion that lives on your machine: it hatches from an egg knowing your name, learns from every conversation, grows through visible life stages as it works for you, writes its own skills from experience, remembers what matters across months, and reaches out when something needs your attention. Wrapped around it is a full personal workspace â€” chat, research, notes, tasks, calendar, email â€” so the creature isn't a gimmick on top of a toy; it's the soul of a real daily-driver product.

**One sentence:** *Tamagotchi soul, principal-engineer brain, flagship-product skin.*

### Why these three parents

| Parent | What we take | What we leave |
|---|---|---|
| **vellum-assistant** (MIT) | Hatch ritual, SOUL identity, structured memory with dedup, proactive check-ins, trust model | Swift/cloud architecture |
| **hermes-agent** (MIT) | Self-improving skills, agent loop + tools, multi-provider freedom, scheduler, subagents | Terminal-first UX |
| **odysseus** (AGPL â€” *inspiration only, never read its source*) | Self-hosted workspace surface layout: chat / research / documents / notes / tasks / calendar / email / memory | All code |

### Product principles

1. **Alive, not animated.** The creature reacts to real system state (thinking, learning, remembering) â€” never fake idle theater.
2. **Growth is earned.** XP comes only from genuine work done together. No daily-login farming.
3. **Charm never blocks work.** Every pet feature must be ignorable; the workspace stays a serious tool. No punitive decay, no guilt mechanics.
4. **Local-first, private by default.** One SQLite file, local embeddings, local models supported. Cloud models are opt-in.
5. **The user can see and edit everything the agent believes** â€” memory browser, soul file, skills â€” trust through transparency.
6. **Flagship visual quality.** If a screen wouldn't survive a Linear/Raycast screenshot comparison, it isn't done.

---

## 2. Users & success

**Primary user (v1):** Arghya â€” technical solo operator, Windows 11, runs Ollama locally, wants one assistant that compounds knowledge instead of fifty stateless chats.

**Secondary (v2+):** technically-comfortable individuals who want a private, personal AI with personality; self-hosters.

### Success metrics (30 days post-v0.3)

| Metric | Target |
|---|---|
| Daily sessions with the companion | â‰¥ 1/day, 5 days/week (real usage, not testing) |
| Memories formed and *kept* (not deleted as junk) | â‰¥ 30 |
| Agent-authored skills approved by user | â‰¥ 3 |
| Proactive messages rated useful (not dismissed) | â‰¥ 50% |
| "Does it feel alive?" gut check | Yes without hesitation |

---

## 3. The Companion System (the differentiator)

### 3.1 Hatch ritual (first run)

First launch shows no dashboard â€” only a dark void with a faintly glowing, slowly pulsing egg.

Flow (~2 minutes, full-screen, skippable only by closing the app):
1. Egg pulses. Single line: *"Something is waking up."*
2. Five conversational questions, one at a time (typed answers seed `user_profile` + SOUL.md):
   - "What should it call you?"
   - "What will you name it?" (creature name â‰  app name)
   - "How should it speak â€” direct, warm, playful, formal?"
   - "What do you spend most of your days on?"
   - "What should it never do?" (seeds boundaries)
3. Each answer makes the egg glow brighter / crack further.
4. Final crack animation â†’ creature hatches at Stage 1, greets the user **by name, in the chosen voice**, and stores its first memory: the hatching.
5. Lands in the Den.

Technical: `pet` table row created; SOUL.md regenerated from template + answers; first journal entry written.

### 3.2 The creature

An original vector creature (SVG + CSS/JS animation, no sprite sheets, no licensed IP): an ember-eyed, claw-tailed "neural familiar" whose body is built from layered glowing strokes â€” reads as alive at 64px and as artwork at 320px.

**Life stages** (silhouette visibly changes each stage):

| Stage | Name | XP | Visual |
|---|---|---|---|
| 0 | Egg | â€” | Pulsing egg (pre-hatch only) |
| 1 | Hatchling | 0â€“250 | Small, big eyes, stubby tail |
| 2 | Juvenile | 250â€“1,000 | Leaner, brighter strokes, tail grows |
| 3 | Adult | 1,000â€“3,000 | Full silhouette, idle animations richer |
| 4 | Elder | 3,000+ | Larger aura, particle wisps, rare animations |

**Live states** (driven by real system events, priority order): `sleeping` (app idle >30min) â†’ `thinking` (agent loop running) â†’ `working` (tool executing â€” icon of tool floats near it) â†’ `learning` (memory extraction / skill reflection running) â†’ `celebrating` (level-up, skill approved) â†’ `idle` (breathing, blinking, occasional glance).

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

- **SOUL.md** â€” seeded at hatch, user-editable, hot-reloaded into every system prompt.
- **Journal** â€” nightly scheduled job: creature writes a short first-person reflection on the day's interactions (what it learned, what it got wrong, what the user seems to care about). Visible in the Den; last 3 entries injected into context. This is how personality *drifts* over time â€” vellum's mechanism, our implementation.
- **Choice memory** â€” when the user corrects or confirms a behavior ("stop doing X", "yes, always do that"), the agent must store a `preference` memory; preferences are always-injected. The creature "remembers choices."

### 3.5 Mood (light touch)

Derived, never punitive: `radiant` (recent level-up / streak of successful work) Â· `content` (default) Â· `curious` (new project detected in memories) Â· `drowsy` (no interaction 3+ days â€” expressed as sleepy art, **never** guilt text). Mood tints idle animation + one line in the Den. No hunger, no death, no nagging.

### 3.6 Den (home surface, replaces bare /chat as landing)

Layout: creature stage front-center (large, animated, reacts to cursor) Â· name + stage + XP ring Â· mood line Â· "what I did while you were away" digest (job runs, memories formed, drafts proposed) Â· latest journal entry Â· quick actions (talk, review skill drafts, see memories) Â· streak/â€œdays aliveâ€ counter.

### 3.7 Ambient presence

Small live creature widget (â‰ˆ40px) in the rail bottom on every surface â€” mirrors live state (thinking/working/learning). Click â†’ jumps to Den. During chat streaming, the creature in the rail visibly "thinks."

---

## 4. Capability pillars (Hermes brain)

Already shipped (v0.1, verified live):
- **Agent loop** â€” plan â†’ tool calls â†’ respond, streaming SSE, step budget, audit log
- **Tools** â€” workspace files, shell (trust-gated), web search/fetch, history search, notes, memory CRUD
- **Memory engine** â€” typed memories (identity/preference/project/event/fact), local embeddings (fastembed), hybrid retrieval (sqlite-vec KNN + FTS5 BM25 + RRF), LLM extraction with dedup + plausibility gate
- **Provider freedom** â€” NIM / OpenRouter / Ollama behind role router (primary/cheap/local) with failover; tool-capability guard
- **Trust tiers** â€” READ < WRITE < EXECUTE < NETWORK_SENSITIVE; auto-allow threshold in config

Built, uncommitted (finish in v0.3):
- **Self-improving skills** â€” agent reflects post-task, drafts SKILL.md playbooks â†’ user approves â†’ versioned, reusable via `use_skill`
- **Scheduler** â€” cron jobs, headless agent tasks, nightly journal job, hourly proactive heartbeat (cheap-model gate, code-enforced rate limit + quiet hours)
- **Approvals** â€” high-risk tool calls pause for user approve/deny (web UI now, Telegram later)

Later: Telegram gateway Â· subagents Â· MCP client Â· deep research runs.

---

## 5. Workspace surfaces (Odysseus layout)

Left rail (creature widget bottom), surfaces in order:
**Den** (home) Â· **Chat** Â· **Research** Â· **Documents** Â· **Notes** Â· **Tasks** Â· **Calendar** Â· **Email** Â· **Memory** Â· **Skills** Â· **Settings**

Shipped: Chat, Memory, Notes, Settings (functional, visuals below bar). Stubs: Research, Documents, Tasks, Calendar, Email, Skills.

---

## 6. UI/UX requirements (the "multi-million-dollar" bar)

Current UI verdict (screenshot audit, 2026-06-13): functionally clean, visually generic â€” flat surfaces, no depth, no motion, naked OS dropdowns, template empty states. **Full visual overhaul is a v0.2 blocker, not polish.**

### Direction: **"Bioluminescent terminal"**
A dark instrument panel that something alive inhabits. Deep layered surfaces with subtle radial atmosphere; one living accent (ember/amber, the creature's color) that *means* the creature â€” accent glow intensity literally tracks agent activity. Display font with personality for moments (hatch, level-up, Den), disciplined UI sans everywhere else.

### Hard requirements
1. Layered elevation system (page â†’ raised â†’ overlay) with inner-highlight borders + soft shadows â€” no flat single-plane screens
2. Motion system: 150/300/500ms tokens, ease-out-expo; every interactive element has designed hover/focus/active; list mount stagger; route crossfade; streaming text cursor shimmer
3. Custom select/popover/dialog/toast primitives (Radix unstyled under the hood) â€” **zero** native OS controls visible
4. Designed empty states per surface (creature-themed illustration + one action), no icon+text templates
5. Skeleton loaders, optimistic updates, undo toasts (no instant silent deletes)
6. SPA deep-link fallback (fixed), favicon + app title, keyboard map (Ctrl+K palette in v0.3)
7. WCAG 2.2 AA: contrast, focus-visible, reduced-motion honors `prefers-reduced-motion` (creature falls back to static art)
8. Every shipped surface screenshot-tested at 1280/768 widths against the styleguide

Reference quality bar: Linear, Raycast, Arc. Reference soul: Tamagotchi, Finch, Duolingo's character energy â€” **without** their nagging.

---

## 7. Roadmap (resequenced 2026-06-13: companion + skin before reach)

| Version | Name | Contents | Exit test |
|---|---|---|---|
| v0.1 âœ… | Brain | Agent loop, memory, tools, provider router, basic 4 surfaces | Live agent turn via Ollama â€” passed |
| **v0.2** | **Soul + Skin** | Design-system overhaul (tokens, primitives, motion), hatch ritual, creature (4 stages + live states), Den, ambient widget, XP engine + events, mood, SPA/favicon fixes, custom controls | Fresh install â†’ hatch â†’ chat â†’ creature visibly reacts + gains XP; UI survives screenshot test |
| v0.3 | Growth | Skills system (finish: reflector + approval UI), scheduler + nightly journal + proactive heartbeat, Ctrl+K palette, toasts/skeletons everywhere | Agent drafts skill from real task â†’ approve in UI â†’ reused next session; journal appears in Den |
| v0.4 | Reach | Telegram gateway (allowlist, streaming, approval buttons), approvals end-to-end, notifications | Round-trip Telegram chat + approve EXECUTE from phone |
| v0.5 | Workspace | Documents (multi-tab editor + AI assist), Tasks + Calendar, Research runs with cited reports | "Remind me Friday" â†’ calendar; research query â†’ clickable citations |
| v0.6 | Comms | Email triage (IMAP/SMTP, AI tags, drafts), MCP client | Seeded inbox tagged correctly; AI draft sent to self |

## 8. Out of scope (v1)

Multi-user/auth Â· mobile apps Â· cloud sync Â· voice Â· marketplace/sharing of skills Â· Docker Â· payments Â· model fine-tuning Â· 3D creature.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Pet reads as cringe to a serious user | Principle 3: ignorable; mood/XP never block or nag; Den is one surface among ten |
| Creature art quality ceiling (no artist) | Vector + motion design > illustration skill; stage silhouettes simple; iterate in styleguide |
| XP farming makes growth meaningless | Server-side awards only, daily caps, claw-backs |
| Small local models pollute soul/journal | Plausibility gates (shipped for memory); journal uses primary role when available |
| AGPL contamination from odysseus | Layout inspiration from screenshots only â€” repo never opened |
| Scope explosion (pet + workspace + agent) | Strict version gates above; each version independently shippable |

## 10. Open questions

1. Creature art: single species evolving, or hatch-time variation (color tint from personality answers)? â€” *default: one species, personality-tinted accent*
2. Journal model: spend primary-role tokens nightly, or cheap-role with quality gate? â€” *default: primary if key present, else skip night*
3. XP visible everywhere or Den-only? â€” *default: Den + level-up toast only*

---

*Implementation reference: see `C:\Users\Arghya Chowdhury\.claude\plans\i-am-looking-to-virtual-manatee.md` (architecture) â€” superseded where this PRD conflicts. Repo: `D:\AI Pet Companion v1`.*
