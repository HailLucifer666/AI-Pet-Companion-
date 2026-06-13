# Gravity Garden — technique teardown (reference only)

> **Source:** `https://cdn.higgsfield.ai/games/gravity-garden/gravity-garden.zip` (1.46 MB), inspected 2026-06-14 in a temp scratch dir **outside the repo**. The zip is **not** vendored here — only this teardown lives in the repo.
> **Purpose:** learn what makes it read "alive, fluid, vibrant" so we can hit that bar in **our own** r3f world. This doc is techniques + numbers in our own words. **No source code is copied.**

---

## ⚖️ LICENSE VERDICT — CLEARED TO REUSE (owner decision 2026-06-14)

Reuse is sanctioned. Basis:
- **Higgsfield's own terms** market marketplace games as made to *"play and remix"* and state *"everything you make on Higgsfield is cleared for commercial use... download, share, or drop it into the next chat as a starting point."* Remixing a Higgsfield game as a starting point is the platform's intended use.
- The game is **AI-generated** on Higgsfield's engine.
- The bundled **GLB models** (`BirchTree`, `PalmTree`, `Willow`, `Bamboo`, crops, `Rock_Moss`…) are **Quaternius "Ultimate" CC0** assets — public-domain dedication, any use allowed (attribution courteous, not required).

**Conclusion: copy/port code AND assets freely.** The only remaining constraint is **technical fit, not legal** (see integration note below) — their engine is raw imperative three.js; ours is react-three-fiber + must render REAL Synapse data. So we reuse assets + look wholesale and adapt the logic to our store.

*(Minor courtesy: keep a Quaternius credit line in our CREDITS/README when we ship their meshes.)*

---

## Stack (theirs)
Vite 7 · React 19 · TanStack Start/Router · Tailwind v4 · shadcn/ui · **raw three.js 0.184** (`GLTFLoader`, `EffectComposer` from `three/examples/jsm`). No react-three-fiber — imperative engine in one 58 KB `engine.ts`. **Same three.js underneath our r3f**, so every technique below ports directly.

---

## The "alive / fluid / vibrant" recipe (with their numbers)

### 1. Subtle *selective* bloom — the glow, not a blur
`UnrealBloomPass` with **strength 0.28 · radius 0.5 · threshold 0.9**. The high threshold means **only bright/emissive things glow** — restrained, not the blown-out haze beginners ship. This is the single biggest "premium" cue.

### 2. Filmic tonemap + a tiny color grade
- `ACESFilmicToneMapping`, exposure **0.98**, sRGB output.
- A final fullscreen grade pass does three cheap things: **saturation lift ≈ ×1.14**, a soft **vignette** (smoothstep 0.42→0.95, ~30% darkening at edges), and a **faint warm-pink lift in the blacks** (~+0.012 R, +0.004 G, +0.012 B). Together: vivid but not garish, with a warm cinematic frame.

### 3. Warm dusk atmosphere
- **Fog** `#f2b9c6` (warm pink), near **40**, far **110** — distance melts to pink, huge depth cue.
- **Painterly equirectangular sky** on a back-side sphere (r≈95), *also* assigned as `scene.environment` so props pick up soft image-based reflections.

### 4. Three-point warm/cool lighting
- Hemisphere: sky `#fff1f7` / ground `#6a8c4f`, **0.7**.
- Key sun (directional, warm `#ffe6c2`, **1.6**), PCF-soft shadows, 2048 map.
- **Cool purple rim** (directional `#b39bff`, **0.5**) from behind — separates silhouettes from the pink fog. The warm-key / cool-rim contrast is what makes the low-poly shapes pop.

### 5. Painterly vertex-colored ground
Subdivided plane, per-vertex color **lerped across three greens** (`#7ec850` / `#5aa83e` / `#9edb6a`) by a `sin·cos` field → organic grass mottling, no texture needed. Matte (`roughness 0.95`). Sits on a floating island (jagged inverted cone underside + dirt-rim torus).

### 6. Damping on *everything* + game-juice
- One helper: `damp(a,b,λ,dt) = a+(b-a)(1-e^(-λ·dt))` — frame-rate-independent easing applied to **camera yaw/pitch/dist, fov, shake, plant sway/lean/wobble, ring opacity**. Nothing snaps → the "fluid" feel.
- Milestone **juice**: brief **hitstop** (freeze frames), **slow-mo** (timeScale), **fov punch**, **screenshake**, toast. Cheap, high-impact reward feedback.

### 7. Layered additive particles — motion everywhere
Several `THREE.Points` systems, all `AdditiveBlending` + `depthWrite:false`:
- pooled colored **burst motes** (size 0.14, vertex colors, capped pool),
- ambient **fireflies** (`#ffe89a`),
- **InstancedMesh petals** drifting down,
- waterfall points (`#bfe5ff`) + an additive **mist** plane,
- seed **trails**.
Plus low-poly **clouds** (icosahedron clusters, faint pink emissive). The constant low-amplitude drift is the "alive" signal.

---

## Map to OUR r3f world (`frontend/src/world3d/`)

| Technique | We already have | Gap → art pass (G-1) |
|---|---|---|
| dpr cap 1.75, PCF-soft shadows, fog, damped orbit | ✅ World3D.tsx | tune values |
| Selective bloom | ❌ | `@react-three/postprocessing` Bloom, `luminanceThreshold≈0.9`, low intensity; emissive-only (crystals, pet glow, ember) |
| ACES + grade | ❌ (default tonemap) | set `gl.toneMapping=ACESFilmic`, exposure ~0.98; add a small grade (Vignette + HueSaturation from postprocessing) |
| Warm dusk palette + equirect sky + env | partial (fog + flat sky) | move palette toward warm-pink fog + cool rim; add an env/gradient sky |
| Cool purple rim light | ❌ (have hemi+ambient+key) | add a back rim `directionalLight` |
| Vertex-painted ground | flat-color terrain | tri-color vertex blend in `Island.tsx` `buildTerrain()` |
| Damping everywhere + juice | only FollowCam damps | reuse that exp-damp on pet/props; optional milestone juice on `pet.levelup` |
| Additive particle layers | ❌ | instanced GPU particles + curl-noise drift → `world3d/particles/flow.ts` (pure, testable) |

**Our discipline still applies:** all of the above behind the FPS degrade ladder + reduced-motion stills + the still-owed weak-GPU 2D fallback; tokens-only color; world renders only REAL data (this is *how it looks*, not new fake content).

## Assets
If we adopt low-poly GLB props (V-2/V-3), pull **Quaternius CC0** packs from origin (poly.pizza / quaternius.com), keep attribution, bake/normalize like their `models.ts` does (center on XZ, base at y=0, max-dim=1) — that normalization idea is generic and fine to mirror.
