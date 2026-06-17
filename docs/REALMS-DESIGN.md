# Realms Design (Path A — The Widening)

> **Status:** BUILD-READY. This is the authoritative spec for Realms II & III. It mirrors `WORLD-VILLAGE.md`'s build-ready format (verified-coords table, camera/fog table, file-by-file change map, tests-green build order) so the Antigravity build app can execute it without further design decisions.
>
> **Winning approach:** *Spoke Gateways — Outer Ruins ring & the Built High Keep*, grafted with the geometry/bug fixes the judge flagged from *The Three Strata* and the framing/STAGE_REVEAL table from *Concentric Rings*.
>
> **Locked constraints honored:** village is additive-only (never moved/replaced); one island, fixed size (`WORLD_SCALE=5`, `ISLAND_MAX_R=80`); land dies at r≈37.5, global terrain peak y≈2.31 at r≈7 (verified — there is no mountain and no room for a new land ring); ≤4 always-on point lights (+1 conditional forge); MAX_D=150 camera ceiling; unlock gated on REAL `pet.stage` only; tests are law.

---

## 0. The one-paragraph pitch (read this first)

The village stays the dense, lit **center**. Realms II and III are **not new land** (the island is provably a flat ~r37 disc). Instead:

- **Realm II "The Outer Ruins"** = the *wilderness ring* at the fence-line. Two existing cobble spokes extend PAST their last building, through a ruin-arch threshold, out to the dark grass band (r32–36) where overgrown ruins sit — a leaning **Warden's Watch** and a **Cairnfield** of memory-stones. "The wilds just beyond the last lantern."
- **Realm III "The High Keep"** = *verticality, built not terrain*. The Keep is a tall procedural stone **Observatory** tower raised on the **empty geometric center of the island** (the global terrain peak at ~(6,6), currently bare because the plaza is offset to (-5,-5)). Plus a **Council Ring** on the SE rim. The "see the whole world" payoff comes from the existing `surveyDist=150` cap finally being usable — **NOT** from new camera code.

The felt Widening is primarily **FOG PUSHBACK** resolving the rim out of the mist (fogFar 240→275→310→350), not dramatic zoom — the island already frames at dist 95. Set this expectation when reviewing: the ruin band is spatially compact (~6 units of usable land between the building ring and the waterline); the fog reveal is what sells "beyond."

Each new realm **earns its existence** by binding to LOCKED Mission work: **Warden → /proactive** (Phase-1 heartbeat), **Observatory → /journal** (Phase-1 nightly scratchpad), **Council → /agents** (shipped MCP). The realms are not decorative.

---

## 1. The realm model + how II/III connect to the village

### Concept

Three concentric zones over the SAME locked island, additive and superset-stacked (`getRealmPlaces(II) ⊇ getRealmPlaces(I)`, `III ⊇ II` — already how `realmData` is authored). Old realms always stay standing and walkable; locked-but-future places render as the cyan wireframe "blueprint" (the existing `locked` path in `Village3D.Building`), teasing the Widening.

- **Realm I — The Bioluminescent Hamlet** (r 0–30): the lit core. Plaza hearth at `PLAZA_POS=(-5,-5)`, buildings radiating. **Unchanged.** (Stage 2 Juvenile gets an intra-realm-I fog widening — see §4.)
- **Realm II — The Outer Ruins** (r 32–36, wilderness ring): adds the full village working set (archives/tasks/calendar) **plus two new surfaces** (warden, cairns) on the rim, reached by extending two spokes through a decorative `ruinGate` arch. Unlocks at **stage 3 (Adult)**.
- **Realm III — The High Keep** (built verticality on the dead center + SE rim): adds two new surfaces (**observatory** on the central peak, **council** on the SE rim), reached past a decorative `ascentGate` arch. Unlocks at **stage 4 (Elder)**.

### ASCII map (top-down, +X right, +Z down; W=5 so 1 grid ≈ 5 world units)

```
                          Z- (north)
                            |
        archives(-5,-30)    |    calendar(5,27.5)
          [II spoke]        |
   ruinGate(8,-32) o========+         o ascentGate(26,20)  ── III threshold
        warden(20,-28) *               *  observatory(6,6)  ── III: KEEP on the
        "Warden's Watch"  [II]          |   "High Keep"        EMPTY GLOBAL PEAK
        /proactive                      |   /journal           (16u built tower)
                                        |
   X- ----garden(22.5,-16.5)----[PLAZA(-5,-5)]----pool(27.5,17.5)---- X+
   (west)         \                hearth hub               /        (east)
                   \                    |                  /
        cairns(-28,-22) *               |          council(18,30) *
        "The Cairnfield" [II]           |          "Council Ring" [III]
        /memory?view=echoes      hollow(-25,-12.5)    /agents
                              workbench(-20,19)
                                        |
                            Z+ (south)
```

`*` = new navigable place. `o` = decorative threshold gate (non-navigable). Plaza is the offset hub at (-5,-5); the geometric center (0,0)→(6,6) is the bare global peak now occupied by the Keep.

### Physical connection (no manual wiring needed)

`villageLayout.ts` **auto-derives one building + one `plaza→place` road for EVERY `ALL_PLACES` entry** (verified, lines 40–55). So adding the four new places to `placeRegistry` automatically creates their spokes/buildings — additive by construction. Pet pathing (`roadGraph.ts`) is the one place that still needs manual node/edge extension (gap C — see §6 step 6).

The two decorative threshold arches (`RUIN_GATE`, `ASCENT_GATE`) are **constants** (like the existing `SPORE_GATE`), NOT `Place` entries — they never enter `ALL_PLACES`, so they never auto-derive a building/road and never hit the on-land place tests.

---

## 2. Exact `realmData.ts` values + new fields

Replace `REALMS` and `getRealmForStage`, and ADD a `STAGE_REVEAL` table. Wire the dead `stageGate` field (gap E) data-driven. Keep `RealmDef` shape; add no per-realm camera fields (the STAGE_REVEAL table owns survey/fog).

```ts
// realmData.ts — full replacement of the selection logic + REALMS table

export type RealmId = "I" | "II" | "III";

export interface RealmDef {
  id: RealmId;
  name: string;
  stageGate: number;   // minimum pet.stage to unlock this realm (NOW WIRED — see getRealmForStage)
  surveyDist: number;  // realm's nominal survey cap (kept for reference; live camera reads STAGE_REVEAL)
  fogFar: number;      // realm's nominal fog (kept for reference; live fog reads STAGE_REVEAL)
  places: Place[];     // interactive places reachable in this realm (superset-stacked)
}

/** The Widening reveal targets, indexed by pet.stage 1..4. DECOUPLED from realm
 *  membership (3 realms) so stage 2 (Juvenile) widens WITHIN realm I — honoring
 *  the Bible's "expands at Juvenile" without a 4th realm. The felt Widening is
 *  primarily fog pushback (240→275→310→350), not zoom (dist 95 already frames r37). */
export const STAGE_REVEAL: Record<1 | 2 | 3 | 4, { surveyDist: number; fogFar: number }> = {
  1: { surveyDist: 95,  fogFar: 240 }, // Hatchling — close, misty hamlet
  2: { surveyDist: 112, fogFar: 275 }, // Juvenile  — the world breathes out (still realm I)
  3: { surveyDist: 128, fogFar: 310 }, // Adult     — fog lifts to r~36, ruins emerge (realm II)
  4: { surveyDist: 150, fogFar: 350 }, // Elder      — full survey, the whole island (realm III)
};

export const REALMS: Record<RealmId, RealmDef> = {
  I: {
    id: "I",
    name: "The Bioluminescent Hamlet",
    stageGate: 1,
    surveyDist: 95,
    fogFar: 240,
    places: ["hollow", "garden", "workbench", "pool", "wander"],
  },
  II: {
    id: "II",
    name: "The Outer Ruins",
    stageGate: 3, // Adult
    surveyDist: 128,
    fogFar: 310,
    // realm I + the full working village + the two ruin surfaces
    places: ["hollow", "garden", "workbench", "pool", "wander",
             "archives", "tasks", "calendar", "warden", "cairns"],
  },
  III: {
    id: "III",
    name: "The High Keep",
    stageGate: 4, // Elder
    surveyDist: 150,
    fogFar: 350,
    // realm II + the keep surfaces (now GENUINELY distinct from II — fixes gap A)
    places: ["hollow", "garden", "workbench", "pool", "wander",
             "archives", "tasks", "calendar", "warden", "cairns",
             "observatory", "council"],
  },
};

/** Data-driven realm selection: the highest realm whose stageGate <= rounded stage.
 *  Wires the previously-dead `stageGate` field (gap E); deletes the hardcoded ifs. */
export function getRealmForStage(stage: number): RealmId {
  const s = Math.round(Number.isFinite(stage) ? stage : 1);
  const ordered: RealmDef[] = [REALMS.I, REALMS.II, REALMS.III];
  let active: RealmId = "I";
  for (const r of ordered) if (s >= r.stageGate) active = r.id;
  return active;
}
```

**Why `Math.round`:** it makes `getRealmForStage(2.6) → "II"` so the stale `widening.test.ts` "rounds fractional stages" assertion passes once `stageReveal` is rebuilt on this (see §4). Real `pet.stage` is always integer 1–4, so rounding is harmless in production.

---

## 3. New Places for `placeRegistry.ts`

### 3a. Verified-coords table (all run through the real `islandHeight`)

`on(x,z)` computes `[x, islandHeight(x,z), z]`. The `pos` column below uses the `on(a*W, b*W)` form (W=5) exactly as the existing entries do. All six pass the `onLand` invariant (`y>0.3 && y<5 && hypot<80`).

| id            | realm | `pos` expression        | world (x,z) | r     | y (verified) | label                | sub                     | route                  | navigable |
|---------------|-------|-------------------------|-------------|-------|--------------|----------------------|-------------------------|------------------------|-----------|
| `warden`      | II    | `on(4*W, -5.6*W)`       | (20,-28)    | 34.4  | 0.53         | The Warden's Watch   | what it did while away  | `/proactive`           | true      |
| `cairns`      | II    | `on(-5.6*W, -4.4*W)`    | (-28,-22)   | 35.6  | 0.32         | The Cairnfield       | faded echoes            | `/memory?view=echoes`  | true      |
| `observatory` | III   | **special (see 3c)**    | base (6,6)  | 8.5   | 2.30 (peak)  | The Observatory Keep | the whole world below   | `/journal`             | true      |
| `council`     | III   | `on(3.6*W, 6*W)`        | (18,30)     | 35.0  | 0.46         | The Council Ring     | how it is allowed to act| `/agents`              | true      |

Decorative gate constants (NOT places, mirror `SPORE_GATE`):

| const         | realm threshold | `on(x,z)`           | world (x,z) | r    | y    |
|---------------|-----------------|---------------------|-------------|------|------|
| `RUIN_GATE`   | I→II            | `on(1.6*W, -6.4*W)` | (8,-32)     | 33.0 | 0.48 |
| `ASCENT_GATE` | II→III          | `on(5.2*W, 4*W)`    | (26,20)     | 32.8 | 0.77 |

### 3b. GRAFTED BUG FIX (do this in the same step) — `tasks` is currently OFF-land

The existing `tasks` place at `on(-7*W, 1*W)` = (-35,5), r35.4, samples **y≈0.24 — below the 0.3 waterline**. Its road midpoint/marker is effectively underwater today (latent bug verified by the judge). **Pull it inward** before adding any new outer-ring places:

```ts
// placeRegistry.ts — tasks entry
  tasks: {
    id: "tasks",
    label: "The Wishing Well",
    sub: "chores & goals",
    route: "/tasks",
    pos: on(-6.6 * W, 1 * W),          // was -7*W → r35.4 y0.24 (OFF-land). Now r33.5, y>0.3.
    anchor: { x: -6.6 * W + 0.8, z: 1 * W + 0.8 },  // keep anchor in sync with pos
    navigable: true,
    nx: 0.2,
    ny: 0.8,
  },
```
Re-run the worldScale/placeDefs suites to confirm `tasks` is now on-land before proceeding.

### 3c. The Observatory's split coordinate (graft from P3)

The Keep BASE sits on the empty global peak; the pet walks to the base, but the marker/label and click-hitbox live at deck height. Use a **literal `pos` array** (not `on(...)`) so the marker floats at the deck, plus an `anchor` at the base for pathing:

```ts
import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
// ...
  observatory: {
    id: "observatory",
    label: "The Observatory Keep",
    sub: "the whole world below",
    route: "/journal",
    pos: [6, islandHeight(6, 6, ISLAND_MAX_R) + 16, 6], // marker/label at the deck (~y18)
    anchor: { x: 6, z: 6 },                              // pet walks to the keep base
    navigable: true,
    nx: 0.52,
    ny: 0.5,
  },
```

The `onLand` place test (if any asserts on `observatory`) must skip the y-band check for this one entry (its `pos.y` is intentionally ~18). Its `anchor` (6,6) IS on-land (y≈2.30), so pathing is valid. The clickable hitbox is a tall invisible cylinder from base→deck (see §5, KeepObservatory3D).

### 3d. `Place` union + gate constants

```ts
export type Place =
  | "hollow" | "workbench" | "garden" | "pool" | "wander"
  | "archives" | "tasks" | "calendar"
  | "warden" | "cairns" | "observatory" | "council";

// Mirror SPORE_GATE. World-space coords (group sits at islandHeight at render time).
export const RUIN_GATE   = { x:  8, y: 0, z: -32, nx: 0.62, ny: 0.30 };
export const ASCENT_GATE = { x: 26, y: 0, z:  20, nx: 0.78, ny: 0.62 };
```

`PLACES` gains the four new `PlaceEntry` objects above. `getRealmPlaces` needs **no change** — it already filters `ALL_NAV_PLACES` by `REALMS[realm].places`.

### 3e. What each surface opens (real data only)

| Place         | Route                  | Surface it opens                                                        |
|---------------|------------------------|-------------------------------------------------------------------------|
| `warden`      | `/proactive`           | Phase-1 proactivity: scheduled checks, hourly heartbeat log, finish-mood |
| `cairns`      | `/memory?view=echoes`  | Faded/compost memories (rides the existing recency/compost system)       |
| `observatory` | `/journal`             | Phase-1 nightly journal scratchpad + world overview                      |
| `council`     | `/agents`              | MCP tools / autonomy settings (shipped MCP client)                       |

> If a route does not yet exist when III is built, it still opens the overlay shell harmlessly (the rail already reaches every surface). Wiring `/proactive` and `/journal` is Phase-1 work, not part of this realm cut.

---

## 4. Camera / transition behavior (reuse `wideningAt` — ZERO new camera code)

### 4a. Rebuild `stageReveal` to read the table (fixes gap F + the rounding test)

```ts
// widening.ts — full replacement
import { STAGE_REVEAL } from "./realmData";

export interface StageReveal { surveyDist: number; fogFar: number; }

export function stageReveal(stage: number): StageReveal {
  const s = Math.round(Number.isFinite(stage) ? stage : 1);
  const clamped = Math.min(4, Math.max(1, s)) as 1 | 2 | 3 | 4;
  return STAGE_REVEAL[clamped];
}
```

This makes:
- `stageReveal(2)` = {112,275} → **Juvenile now widens** (gap F fixed) while `getRealmForStage(2)="I"` keeps realm membership stable (no new buildings at stage 2).
- `stageReveal(2.6)` = `stageReveal(3)` = {128,310} → the stale **"rounds fractional stages" test passes**.
- `stageReveal(9)` = {150,350}, `stageReveal(0)/NaN` = {95,240} → existing clamp tests pass.
- Monotonic non-decreasing across 1→4 → existing monotonicity test passes.

### 4b. Camera/fog table per stage (no new fields, no new camera code)

| Stage | Pet      | Active realm | surveyDist → CameraRig maxDist | fogFar → Atmosphere | Felt change                                  |
|-------|----------|--------------|--------------------------------|---------------------|----------------------------------------------|
| 1     | Hatchling| I            | 95                             | 240                 | close misty hamlet; ruins hidden in fog      |
| 2     | Juvenile | I            | 112                            | 275                 | world breathes out (intra-realm-I widening)  |
| 3     | Adult    | II           | 128                            | 310                 | fog lifts to r~36; ruins/cairns emerge        |
| 4     | Elder    | III          | 150 (= MAX_D ceiling)          | 350                 | full survey; the Keep + whole island visible |

These already flow: `World3D` reads `stageReveal(stage)` → feeds `reveal.surveyDist` to `<CameraRig maxDist>` (clamped to `MAX_D=150`) and `reveal.fogFar` to `<Atmosphere>`. **No edits to `World3D.tsx` camera logic, `OrbitControls`, `MAX_D`, `MIN_D`, `CAM_CLEAR`, or `maxPolarAngle`.** (Explicitly do NOT add P3's `pitchBias` — it is the one camera change the Village Bible warned against.)

### 4c. The transition moment (already wired in `worldStore.connect`)

On SSE `pet.stage`, `worldStore.connect()` already calls `setStage()` + `widen()` (sets `wideningAt`) + `audioEngine.playHatching()`. `CameraRig` already watches `wideningAt` to punch FOV **+20°** and snap `targetDist` to the new `cap` (the pullback). `LevelUpFlash` already does the 2s white flash. **Keep all of it verbatim.** Because stage 2 now also changes `surveyDist`/`fogFar`, the same Widening moment now fires at Juvenile too — the world visibly breathes. No store changes required (`setStage` already recomputes `activeRealm` via `getRealmForStage`).

### 4d. New realm props fade in (the only new render-time behavior)

New realm geometry (ruins, keep, gates) renders **locked/blueprint** until its realm is active (via the existing `activePlaces` gate in `Building`). On the Widening moment, fade their emissive in over ~2s keyed off `wideningAt` using the existing `bloomFlash(now - wideningAt, 2000)` ramp (same pattern `SporeGate3D` uses) so they "rise from the mist" instead of popping. This is opacity/emissive easing only — no new lights, no camera code.

---

## 5. Terrain / asset implications + low-end perf guardrails

- **No terrain edits.** Zero changes to `terrain.ts`, `islandHeight`, `WORLD_SCALE`, `ISLAND_MAX_R`, the plaza pad, or any realm-I building. All additions layer on top.
- **No new GLBs / textures.** All new structures are procedural primitives reusing `useVillageMaterials` mats (`mats.stone`, `mats.flame`, `mats.blueprint`, Greenhouse glass material). New `Marker` cases reuse existing primitive vocabulary (octahedron/icosahedron/torus/box/cone).
- **Verticality is BUILT, not terrain.** The Keep is a ~16u procedural stone tower at the global peak (6,6). It is the FIRST tall mesh in a strictly-flat world. Guardrails:
  - Keep base r8.5 is well outside the pet's plaza close-up zone (pet rests at plaza r≈7; `MIN_D=6`), so `CAM_CLEAR=2.5` clipping risk at close zoom is acceptable. Do **not** raise the tower above ~16u or it risks the `far:400` / fog interplay at stage 4.
  - The clickable hitbox is a **tall invisible cylinder** (radius ~2, height base→deck) with `visible={false}` but raycast-enabled, so clicking anywhere on the tower opens `/journal`. The `<Html>` label sits at deck height (`pos.y≈18`).
- **Point-light budget (HARD ≤4 always-on + 1 conditional forge).** Current always-on: hearth, forge(conditional), tavern, greenhouse ≈ 4. **All new structures are EMISSIVE-ONLY** — they ride the shared `glowBoost` traversal in the Village root group (zero per-frame cost, like `SkillMonuments`). Add **NO** new point lights. (This is the explicit win over P1, which needed a +1 sweeping SpotLight.)
- **Draw-call budget (~22–25 added on ~200–250).** This is the heaviest plan: +4 buildings (warden tower, cairnfield, keep, council ring) + 2 decorative gate arches + their auto-derived roads + lanterns. **Build MUST verify the total stays within ~22–25 added draw calls** at stage 4 (all geometry visible). Mitigations if over budget: merge the cairn stones into one buffer geometry; keep the council ring to ≤6 stones; gate the gate-arch meshes to render only when within one realm of unlocking.
- **dpr cap [1,1.75], antialias:false, 60fps Intel UHD 620** unchanged. Verify FPS at stage 4 with the dynamic quality ladder (`useQualityLadder`) — if it drops a tier, the emissive-only design means nothing is lost but bloom intensity.

---

## 6. Ordered build checklist (tests-green at every step)

All paths under `F:\AI Pet Companion !\frontend\src\` unless noted. Run `vitest` after each step.

**Step 1 — Fix the two stale/red tests FIRST (blocking; they already fail on master).**
- `world3d/villageLayout.test.ts`: the live `BUILDING_DEFS`/`VILLAGE_ROADS` derive from `ALL_PLACES`, not the stale 3. Update `"derives one building per place"` to assert the live derived id set (after step 3 this is the 10-entry set: `["archives","calendar","cairns","council","garden","hollow","observatory","tasks","warden","workbench"]` sorted — pool is non-nav but IS in `ALL_PLACES`, so confirm against the real `ALL_PLACES.map(p=>p.id)` rather than hardcoding; replace id `"home"` with `"hollow"`). Update `VILLAGE_ROADS` length from `3` to `ALL_PLACES.length`. Keep the `onLand` end+midpoint assertions for every derived road (all new coords pass). Update the road-graph `bfsPath`/`PLACE_ENTRY`/`nearestNode` expectations to match step 6's new nodes.
- `world3d/widening.test.ts`: `"rounds fractional stages"` passes automatically once `stageReveal` rounds (step 4). No edit needed unless the new STAGE_REVEAL values change another assertion — verify monotonic/clamp tests still hold.

**Step 2 — `realmData.ts` (pure data, no render).** Replace `REALMS`, `getRealmForStage`, add `STAGE_REVEAL` exactly as §2. Set `stageGate` I=1/II=3/III=4. Run vitest.

**Step 3 — `placeRegistry.ts` (pure data).** Widen `Place` union (+`warden`,`cairns`,`observatory`,`council`); add the 4 `PlaceEntry` objects (§3a/§3c) with verified coords; add `RUIN_GATE`/`ASCENT_GATE` constants (§3d); **apply the `tasks` inward fix (§3b)**. Run placeDefs/worldScale/widening suites — green (with step 1 test updates).

**Step 4 — `widening.ts`.** Replace `stageReveal` to read `STAGE_REVEAL` with `Math.round`+clamp (§4a). Run widening.test → green.

**Step 5 — `villageLayout.ts`.** Extend `BuildingKind` with `"warden" | "observatory" | "cairns" | "council"`; add `KIND_MAP` entries (`warden→"warden"`, `cairns→"cairns"`, `observatory→"observatory"`, `council→"council"`). `BUILDING_DEFS`/`VILLAGE_ROADS` auto-derive — no manual road wiring.

**Step 6 — `roadGraph.ts` (gap C — pet pathing).** Extend `NodeId`, `NODES`, `RAW_EDGES`, `PLACE_ENTRY` with entrance + junction nodes for `warden`/`cairns`/`observatory`/`council`. Derive each `*_ENT` from the new `PLACES[*].anchor` (same pattern as `HOLLOW_ENT`; for observatory use the base anchor (6,6)). Chain each off the plaza hub (or nearest existing spoke). Re-derive the existing drifted `HOLLOW_ENT`/`WORKBENCH_ENT`/`GARDEN_ENT` from the live `PLACES` anchors if they no longer match. Update `villageLayout.test.ts` road-graph assertions accordingly. Run → green.

**Step 7 — `Village3D.tsx` (render the new buildings).** Add procedural sub-components and extend the `Building` `Body` switch:
- `Warden` — ruined watchtower (stacked stone boxes + a snapped top + one ember-cracked window; reuse `mats.stone`/`mats.flame`).
- `CairnField` — 3–4 stacked-stone cairns with faint garden-glow caps (reuse `mats.stone` + `WORLD.garden` emissive). Merge into one geometry if over draw budget.
- `KeepObservatory3D` — tall tapered stone shaft (y 0→~14) + elevated platform/landing + translucent garden-glass canopy octagon at deck + tall invisible raycast cylinder hitbox. THE verticality.
- `CouncilRing` — low ring of standing stones with ember seat caps.
All render `locked` (cyan `mats.blueprint`) until their realm is active via the existing `activePlaces` gate. **No new point lights.** Emissive ramp on `wideningAt` via `bloomFlash` (§4d).

**Step 8 — `Places3D.tsx` (markers).** Add `Marker` branches for `warden` (tilted broken-tower icon), `cairns` (small cairn cluster), `observatory` (tall thin tower + glowing canopy orb), `council` (low torus/ring). Gating already works via `getRealmPlaces(activeRealm)`. For `observatory` the marker sits at the entry `pos.y≈18` automatically.

**Step 9 — Gate arches.** Clone `SporeGate3D` → `AscentGate3D.tsx` positioned at `ASCENT_GATE`, filling with `xpFrac` toward stage 4, blooming on the III Widening. Optionally a static `RuinGate` decor arch (no fill) at `RUIN_GATE`. Mount both in `World3D.tsx` next to `<SporeGate3D/>`.

**Step 10 — `toolRouter.ts` (optional, low-risk).** Extend `toolCategoryToPlace` so proactivity/reminder tools route to `warden` in realm II/III (so heartbeat pulses originate from the Warden's Watch). Keep realm-I → `workbench`. Add `warden` to the `PulseOrigin` mapping if pulses should emit there.

**Step 11 — Full suite + QA.** Run placeDefs/worldScale/locomotion/LumenformFSM/villageLayout/widening → all green. Build check. Visual QA: set stage 1→2→3→4, confirm fog opens at every stage, ruins then keep fade in, pet walks the new spokes, the whole village is still visitable at Elder, ≤4 point lights, 60fps low-end, draw calls within ~22–25 added.

### File-by-file change map (summary)

| File                              | Change                                                                 |
|-----------------------------------|------------------------------------------------------------------------|
| `world3d/realmData.ts`            | New `REALMS`, `STAGE_REVEAL`, data-driven `getRealmForStage` (wires `stageGate`) |
| `world3d/widening.ts`             | `stageReveal` reads `STAGE_REVEAL` with round+clamp                    |
| `world3d/placeRegistry.ts`        | +4 places, +2 gate constants, widen `Place` union, **fix `tasks` coord**|
| `world3d/villageLayout.ts`        | Extend `BuildingKind` + `KIND_MAP` (auto-derives buildings/roads)     |
| `world3d/roadGraph.ts`            | +4 entrance/junction node pairs, edges, `PLACE_ENTRY` keys             |
| `world3d/Village3D.tsx`           | +Warden/CairnField/KeepObservatory3D/CouncilRing, extend `Building`    |
| `world3d/Places3D.tsx`            | +4 `Marker` branches                                                   |
| `world3d/AscentGate3D.tsx` (NEW)  | Clone of `SporeGate3D` at `ASCENT_GATE`, fills toward stage 4          |
| `world3d/World3D.tsx`             | Mount `<AscentGate3D/>` (+ optional `<RuinGate/>`). **No camera edits.**|
| `world3d/villageLayout.test.ts`   | Reconcile to live derived sets + new road-graph nodes                  |
| `world/entities/lumenform/toolRouter.ts` | (Optional) route proactivity tools → `warden` in II/III         |

---

## 7. Explicitly OUT of scope for the first cut

- **No new camera code.** No `pitchBias`, no dynamic `maxPolarAngle`, no `ascendAt` one-shot, no top-down "look down on the world" tilt. "See the whole world" is delivered by the existing `surveyDist=150` cap only. (This is the deliberate rejection of P3's highest-risk novelty.)
- **No offshore / over-water geometry.** No piers, no boardwalks, no lighthouse beacon, no place with `pos.y<0`. Every place stays on-land (the lone exception is the observatory MARKER floating at deck height, whose ANCHOR is on-land). (Rejection of P1's invariant-breaking offshore beacon and its +1 SpotLight.)
- **No new always-on lights.** Everything new is emissive-only.
- **No new GLB assets or texture pipeline.** Procedural primitives reusing existing materials only.
- **No backend / FSM / ladder changes.** Realm unlock reads real `pet.stage` exactly as today; no new endpoints. The `/proactive` and `/journal` surfaces themselves are Phase-1 work, not this cut — this cut only routes to them.
- **No 4th realm.** Juvenile (stage 2) widening is intra-realm-I via `STAGE_REVEAL[2]`, not a new realm zone.
- **No real terrain altitude.** The Keep's height is a built mesh on the existing flat global peak — on-spec given the provably flat terrain.
- **Affection never gates a realm.** Unlock is REAL XP/stage only (Bible §8).

---

## 8. Honest framing for reviewers (set expectations)

- The island is geometrically tiny: `surveyDist 95` already frames the whole r37 disc. The Widening's felt difference between realms is **FOG PUSHBACK** (240→275→310→350 resolving the rim out of the mist), **not dramatic zoom**. The compact r32–36 ruin band is *intended* to read as "the wilds just beyond the last lantern," not a vast outland.
- The "High Keep" is **built verticality**, not high ground. It is a procedural tower on the flat central peak — acceptable and on-spec because the terrain is provably flat.
- This is the heaviest plan by geometry (5 structures + 2 gates). The single hard gate before shipping is the **~22–25 added draw-call budget verification** at stage 4. It adds **zero** new point lights, so the light cap is safe.
