# AI Pet Companion â€” Council Synthesis (2050 review, triaged)

> Four LLMs (Perplexity deep-research Â· Karpathy-council/DeepSeek Â· Qwen3-Plus Â· Kimi-K2) reviewed the master
> plan and proposed a "2050 cognitive biosphere" elevation (`Multi LLM Improvizaion.txt`). This doc is the
> **triage**: every proposal run through AI Pet Companion's one binding gate â€” *the world renders only real
> computation* â€” and either canonized, rejected, or deferred. Grounded in a backend signal audit, not vibes.
>
> **Date:** 2026-06-14 Â· **Status:** synthesis adopted Â· feature work tracked in `ROADMAP.md` + the master plan.

---

## The 3 Laws (adopted as principles)

The reviews converged on a philosophy worth keeping â€” it's free, and it sharpens every later decision:

1. **The world is the mind.** Every visual element maps to a real computational process. Nothing decorative, nothing faked. *Beauty emerges from truth.*
2. **The pet has agency, not the user.** The pet initiates, proposes, reflects; the user guides, approves, collaborates. A partner, not a servant. (Bounded by the existing no-guilt / no-nagging / charm-never-blocks rules.)
3. **Transparency is the interface.** The user can always look inside â€” memory associations, confidence, state. Trust through visibility, not opacity.

These do **not** replace the binding guardrails (MIT-only, real-data-only, budgets, reduced-motion, server-side XP, zero XP from affection). They sit on top as intent.

---

## Backend reality audit (the gate that decides everything)

What real signals the backend actually produces today. This is what separates buildable from fantasy.

| Capability | Verdict | Evidence |
|---|---|---|
| **Memory embeddings** | REAL-NOW | `memory/embedder.py` â€” local **bge-small-en-v1.5** (384-dim, fastembed/ONNX, CPU). `memory/store.py` writes `vec_memories(memory_id, embedding, model_name)` in **sqlite-vec**; `vec_distance_cosine()` available. Any two memories' similarity computable locally. |
| **Memory recency** | REAL-NOW | `memories.last_accessed_at` + `access_count` updated on every `search_memories()`. (Not yet projected through the API â€” `_row_to_memory()` omits them.) |
| **Synapse events** | REAL-NOW | `agent.thinking/done`, `agent.tool.start/end`, `memory.formed/forgotten`, `skill.drafted`, `xp.awarded` (amount/total/stage), `pet.levelup`, `pet.stage`. |
| **Token streaming on the bus** | REAL-WITH-WORK | Chat deltas stream from `/api/chat` (`routes.py:228`) but are **not** published on the Synapse bus. Adding a `token.stream` event is small. |
| **LLM internals (attention / logprobs)** | NOT-REAL | Only `providers/openai_compat.py` (Ollama or hosted OpenAI-compat). Requests text + tools; never `logprobs`/attention. No local-inference path. Hosted APIs don't expose attention regardless. |
| **Pet / XP** | REAL-NOW | `GET /api/pet` â†’ stage(1â€“4), xp, traits. `frac=(xp%100)/100` derivable. `mood` column **exists but is an unwired stub** â€” nothing writes it. |
| **MCP** | NOT-REAL | Only a "later" comment in `tools/registry.py`. No server/client/dep. |

---

## Verdict table â€” what survives the gate

| Review idea | Verdict | Why |
|---|---|---|
| Semantic crystal placement + similarity threads | âœ… **REAL-NOW** | embeddings + cosine in sqlite-vec |
| Compost / Ebbinghaus forgetting | âœ… **REAL-NOW** | `last_accessed_at` + `access_count` exist |
| Emotion vector (arousal/valence/curiosity/confidence) | ðŸŸ¡ **REAL-WITH-WORK** | derive from real agent cadence; fill the `mood` stub â€” **no faked user sentiment** |
| Mind's Eye (memory web + confidence + live-retrieval spotlight) | âœ… **REAL-NOW** (subset) | embeddings = graph; `confidence` stored; `search_memories` marks what's retrieved |
| Diegetic streaming chat | ðŸŸ¡ **REAL-WITH-WORK** | add `token.stream` to the bus from existing deltas |
| Critically-damped spring camera + breathing bubble | âœ… **REAL-NOW** | pure polish on V-2f |
| Crystal grow-from-ground Â· spline-arc pulses Â· fire roar | âœ… **REAL-NOW** | V-2e polish, real events |
| Biome morph by cognitive domain | ðŸŸ¡ **REAL-WITH-WORK** | needs context classification; soft â†’ **defer** |
| Attention-head mycelium / reasoning-chain viz | âŒ **REJECT (literal)** | no attention/logprobs from hosted APIs; would be faked |
| Multi-modal emotion (webcam HRV / voice / biometric) | âŒ **REJECT now** | no sensors; privacy; far-future opt-in |
| Quantum / neuromorphic / BCI / "consciousness metrics" | âŒ **REJECT** | buzzword theater, no backing signal |
| MCP-first architecture | â¸ **DEFER** | legit future bet, large, nothing today |

---

## Canonized elevations (real-data form)

Reframed so each is honestly backed. Specs live here; slice tracking in `ROADMAP.md` + master plan. **None built yet.**

### V-2g Â· Living Memory Web â€” REAL-NOW Â· effort L
The biggest real "2050" upgrade. Crystals stop being scattered decoration and become a navigable map of the AI's actual memory.
- Surface `last_accessed_at` / `access_count` + per-pair cosine through a new read path (`GET /api/memory/graph`, or extend `api.memory()`).
- Place / relax crystals by **embedding similarity** â€” heavy projection (UMAP/PCA/MDS over the 384-dim vectors) computed **backend/offline**, frontend just renders the 2-D/3-D positions. Deterministic for a given memory set.
- Glowing **threads** between near-neighbor crystals; thickness = similarity.
- **Compost:** crystals not accessed/reinforced decay â†’ spores sink through the mycelium to the roots. The specific memory fades; the network strength (XP) persists. Driven by real recency, not a timer.

### V-2h Â· Emotion Vector â€” REAL-WITH-WORK Â· effort M
Replace the flat FSM ladder's affect with a continuous vector â€” sourced from the AI's **own activity**, never an inference of the user's feelings.
- Pure `world3d/emotion.ts`: real Synapse cadence (tool activity, memory-formation rate, XP velocity, idle time) â†’ `{arousal, valence, curiosity, confidence}` âˆˆ continuous ranges. Unit-tested.
- Backend writes the derived value to the existing `mood` stub.
- Drives pet glow / colour-temperature / movement style; composes with weather. FSM stays as the discrete behavior layer.

### V-2i Â· Mind's Eye â€” REAL-NOW (subset) Â· effort L
"Explainable AI made beautiful," but only the parts we can back.
- Toggle (key `M`): zoom into the memory web â€” embedding-projected graph of real memories, edges = cosine, node brightness = stored `confidence`.
- A moving **spotlight** = memories currently returned by `search_memories` (real retrieval).
- **Excluded:** any reasoning-chain / attention visualization (no real signal â€” see Rejected).
- reduced-motion = static graph.

### B-1 + W-8 Â· Diegetic streaming chat â€” REAL-WITH-WORK Â· effort M
- **Backend (B-1):** publish a `token.stream` event onto the Synapse bus alongside the existing `/api/chat` deltas.
- **Frontend (W-8):** the pet speaks the streaming reply in a 3-D bubble â€” extends the V-2f `PetBubble` / drei `<Html>` anchor. The Chat surface stays the power path.

---

## Rejected / Deferred ledger

Recorded so these aren't re-chased every time a shiny review lands.

**Rejected â€” fail the real-data gate today:**
- **Attention-head mycelium / reasoning-chain viz** â€” hosted APIs expose no attention or logprobs; no local-inference path. Any such viz would be fabricated. The honest substitute already planned: visualize *tool / memory-retrieval activity* (real) â€” and never label it "attention."
- **Multi-modal emotion** (webcam heart-rate, voice stress, biometric) â€” no sensors wired, privacy-sensitive. Possible far-future **opt-in, local-only**, but not now.
- **Quantum-inspired probability clouds Â· neuromorphic layer Â· BCI readiness Â· "consciousness metrics"** â€” no backing signal; pure theater. Out of scope.

**Deferred â€” legit but later:**
- **MCP-first architecture** â€” real future direction (already a "later" note in `tools/registry.py`); large, nothing today. Lands in a dedicated phase.
- **Biome morph by cognitive domain** â€” needs reliable context classification of the active task; soft signal, revisit after the memory web exists.

---

## Stack canonicalization (resolving the doc-debt two reviews flagged)

The master plan's **W-2 describes a PixiJS engine**, but the project pivoted to **3D in the V-2 slices** (react-three-fiber: `OrbitControls`, drei `<Html>`, `@react-three/postprocessing`). That contradiction is real and confusing.

**Canonical world stack: React + Vite + Three.js / react-three-fiber.** The W-2 "PixiJS" text is **superseded** by the V-2 3D pivot and should be read as historical. WebGPU is a *possible* future renderer path (only if a real perf need appears, e.g. 10k+ particles), not a commitment. Budgets unchanged: main â‰¤300 kB gz, world chunk â‰¤350 kB gz lazy.

---

## Addendum â€” V-4 Sight & Voice (clicky-inspired)

A later request (add [farzaa/clicky](https://github.com/farzaa/clicky)'s features â€” see/talk/point/teach) became a
planned milestone, **V-4 Â· Sight & Voice** (full spec: `docs/SIGHT-AND-VOICE.md`). It **partially realizes the
"ambient awareness / proactive" theme deferred above** â€” the pet gains real senses (screen sight, voice) and
teaches from what's on screen. Re-grounded against this gate:
- **Real-desktop pointing requires a native shell** (Tauri) â€” a browser tab can't draw on the OS. Browser mode
  degrades to pointing on a captured screenshot in-app.
- **Cloud voice (ElevenLabs/AssemblyAI) rejected** (paid, breaks local-first) â†’ free Web Speech (browser) + local
  Whisper (shell).
- **Privacy:** a hosted vision brain means the screenshot leaves the device â†’ opt-in/on-demand only, never
  persisted, UI warns; fully-local sight via an Ollama vision model.

## What this changes in practice

- The roadmap gains four **gated** branches (V-2g/h/i, B-1) â€” each already passed the reality check, so they're cleared to build when their turn comes.
- The order is unchanged near-term: finish **V-2f** (camera + bubble), then **V-2e** (reactive core). The elevations build on top of V-2e's crystals/gate.
- The 3 Laws become the lens for future proposals; the ledger is the filter. *Every pixel represents real thought â€” or it doesn't ship.*
