# WORLD-VILLAGE.md â€” Bioluminescent Medieval Village (V-World direction)

> Build-ready specification. Read this cold and implement it. It is self-contained.
> All file paths are absolute. All coordinates are in world units. `WORLD_SCALE = W = 7`,
> `ISLAND_MAX_R = 16 * W = 112`. Heights were sampled against the real `islandHeight()` in `frontend/src/world3d/terrain.ts` and are verified on land.

---

## 1. Vision & the fused look

A small medieval hamlet IS the world, and the bioluminescent magic is the mood/lighting layer painted over it â€” not a separate biome. A central cobblestone **plaza with a hearth/bonfire** is the hub; three low-poly buildings (a **tavern**, a **forge/workshop**, a **greenhouse-shrine**) radiate around it, and cobble **roads spoke out** from the plaza to each building, flanked by fences and glow-mushrooms. The companion **rests at the plaza hearth** and **walks the roads building-to-building** to do real work. Medieval CC0 geometry (KayKit, Kenney) is recolored to our dusk tokens â€” dark indigo stone, near-black roofs, dark timber â€” while every window, lantern, crystal and mushroom glows in `WORLD.ember` / `WORLD.garden`, the same emissive vocabulary the pet already uses. The screenshot test is "magical dusk hamlet at the edge of night," never "daytime RPG town." This is **additive**: terrain, weatherÃ—day/night, bloom, motes, crystals, the diorama camera, pet locomotion, and the Places/surface system all survive unchanged except where this doc explicitly says CHANGED.

---

## 2. Locked decisions (contradictions between facets resolved here â€” follow THESE)

These resolve real disagreements among the five facet drafts. Where a facet proposed something that breaks an existing test, this doc overrides it. Hard data from sampling `islandHeight()` is cited.

1. **Place ids are NOT renamed.** The canonical navigable surface ids stay exactly `hollow`, `garden`, `workbench`. `placeDefs.test.ts` line 7 hard-asserts `PLACES_3D.map(p=>p.id).sort() === ["garden","hollow","workbench"]`. Any facet text that renamed these to `tavern`/`workshop`/`greenhouse` is rejected. "Tavern/forge/greenhouse" are **building visual kinds**, not place ids.

2. **The plaza is a separate concept from the surface places.** `PLACES_3D` keeps exactly the three surface buildings. The plaza hub is exported as a separate constant `PLAZA_POS` so adding it never breaks the array-equality test.

3. **Plaza hub location = `(-7, -7)` = `(-1*W, -1*W)`, NOT the origin.** Sampled heights: origin `(0,0)` = **3.295** (rock-band edge â€” `colorForHeight` switches to rock at yâ‰¥3.4, and the hub would sit on a peak); plaza `(-7,-7)` = **2.088** (solid mid-grass). The layout facet's `(-7,-7)` wins over the perf/places facets' `(0,0)`. Pet home anchor beside the hearth = `(-5.8, -6.3)`, height **2.317** â€” passes the `worldScale.test.ts` ceiling (`0.3 < y < 5`).

4. **The pet's `home` moves to the plaza hearth.** Today `ANCHORS.home` sits beside the Hollow fire at `(-33.8, -16.8)`. It moves to `(-5.8, -6.3)` (plaza). This is the one behavioural change: the companion rests at the plaza and walks out to buildings, then returns â€” it no longer lives at the tavern.

5. **The FSM is NOT re-routed in the first cut.** The places-buildings facet proposed routing `memory-formed` to `place:"garden"`. That **breaks `LumenformFSM.test.ts` line 37â€“42**, which asserts the pet plants where it stands (`place:"pool"` stays `"pool"`). The FSM stays exactly as-is. Walking to the greenhouse on memory-formed is a deferred V-2.5 item (Â§11) requiring a coordinated test update â€” out of scope for the first cut.

6. **Widening the `Place` type is deferred, not done in the first cut.** Several facets widen `Place` to add `"garden"`/`"hollow"`. The first cut does NOT need this: the pet only ever routes to `home`/`workbench`/`pool`/`wander` (FSM unchanged), and the road graph keys its own entry table by string so it tolerates places the union doesn't yet name. Type-widening + `toolCategoryToPlace()` is the V-2.5 "toolâ†’place routing" sprint (Â§11).

7. **Buildings are PROCEDURAL low-poly meshes for the first cut, with a GLB swap hook later.** No GLB assets are vendored in the repo yet (`public/models/` has only Quaternius nature). Shipping today means hand-built primitive geometry in the dusk palette â€” the exact pattern the existing `Places3D` markers already use. KayKit/Kenney GLBs are a later additive swap (Â§6.6 / Â§11) touching only the building renderer, never the data model. This keeps `DRACOLoader` / asset-pipeline work off the critical path.

8. **Roads are 3 procedural terrain-following strips**, one draw call each (a `BufferGeometry` of quads sampled on `islandHeight`, vertex-colored cobble), NOT instanced tile GLBs. Fences are instanced later with the GLB swap; first cut uses simple procedural posts or omits them until the GLB pass.

9. **One new renderer file owns it all: `Village3D.tsx`.** Mounted once in `World3D.tsx` between `<Island />` and `<GlowMushrooms3D />`. Road graph + layout data live in pure modules. The diorama camera, weather, bloom, particles, crystals, and pet are untouched.

10. **`Postfx` bloom threshold rises to make the look read.** `luminanceThreshold` `0.72 â†’ 0.90` so only emissive windows/lanterns/mushrooms/crystals bloom, not lit stone. Already a queued ROADMAP V-2.5 quick-win; the single change separating "glowing amber windows in dark stone" from "everything haloed."

---

## 3. The data model

Two new pure modules (no three, no React â†’ unit-testable in Node), plus tiny derivations in existing files. There is intentionally **no big-bang placeRegistry rewrite in the first cut** â€” that consolidation is a V-2.5 architecture item (Â§11). The first cut adds the minimum: a plaza constant, a road graph, and a village layout table that DERIVES from the existing `PLACES_3D` so coordinates are never duplicated.

### 3.1 `frontend/src/world3d/placeDefs.ts` â€” add `PLAZA_POS` only

`PLACES_3D` is unchanged (test-locked). Add one export:

```ts
// ADD to placeDefs.ts â€” the plaza hub. NOT a surface; not in PLACES_3D.
export const PLAZA_POS: [number, number, number] = on(-1 * W, -1 * W); // (-7, h=2.088, -7)
```

### 3.2 New module: `frontend/src/world3d/villageLayout.ts` (pure)

Single source of building placements, road specs, and clear radii â€” all DERIVED from `PLACES_3D` + `PLAZA_POS`, so no coordinate is written twice.

```ts
import { PLACES_3D, PLAZA_POS, type PlaceKind } from "./placeDefs";

export type BuildingKind = "tavern" | "workshop" | "greenhouse";

const KIND_MAP: Record<PlaceKind, BuildingKind> = {
  hollow: "tavern", workbench: "workshop", garden: "greenhouse",
};

export interface BuildingDef {
  id: string;            // matches PLACES_3D id ("hollow" | "garden" | "workbench")
  kind: BuildingKind;
  pos: [number, number, number];
  rotationY: number;     // radians â€” building faces the plaza
}
export interface RoadSpec {
  id: string;
  fromX: number; fromZ: number; toX: number; toZ: number;
  width: number; segmentLen: number;
}

const [px, , pz] = PLAZA_POS;

export const BUILDING_DEFS: BuildingDef[] = PLACES_3D.map((p) => ({
  id: p.id, kind: KIND_MAP[p.kind], pos: p.pos,
  rotationY: Math.atan2(px - p.pos[0], pz - p.pos[2]),
}));

export const VILLAGE_ROADS: RoadSpec[] = PLACES_3D.map((p) => ({
  id: `plaza-${p.id}`, fromX: px, fromZ: pz, toX: p.pos[0], toZ: p.pos[2],
  width: 1.8, segmentLen: 1.5,
}));

export const BUILDING_CLEAR_R = 4.0;
export const PLAZA_CLEAR_R = 5.5;
```

### 3.3 New module: `frontend/src/world3d/roadGraph.ts` (pure)

Waypoint graph for pet pathing + a procedural road-strip geometry builder. Spoke tree: plaza â†’ junction â†’ entrance per building. Undirected; BFS finds the unique shortest sequence. Adding cross-road edges later needs zero path-follower changes.

**Node coordinates (verified; road samples stay in the 1.15â€“3.52 grass band â€” no water, no rock peak):**

| NodeId | x | z | derivation |
|---|---|---|---|
| `plaza` | -7 | -7 | `PLAZA_POS` xz |
| `hollow_jct` | -21 | -12.25 | midpoint plazaâ†’hollow |
| `hollow_entrance` | -33.8 | -16.8 | hollow anchor |
| `workbench_jct` | -17.5 | 9.8 | midpoint plazaâ†’workbench |
| `workbench_entrance` | -27.2 | 25.8 | workbench anchor |
| `garden_jct` | 12.25 | -15.05 | midpoint plazaâ†’garden |
| `garden_entrance` | 30.4 | -22.5 | garden anchor |

```ts
import type { Vec2 } from "./locomotion";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import type { RoadSpec } from "./villageLayout";

export type NodeId = "plaza"
  | "hollow_jct" | "hollow_entrance"
  | "workbench_jct" | "workbench_entrance"
  | "garden_jct" | "garden_entrance";

export const NODES: Readonly<Record<NodeId, Vec2>> = {
  plaza: { x: -7, z: -7 },
  hollow_jct: { x: -21, z: -12.25 }, hollow_entrance: { x: -33.8, z: -16.8 },
  workbench_jct: { x: -17.5, z: 9.8 }, workbench_entrance: { x: -27.2, z: 25.8 },
  garden_jct: { x: 12.25, z: -15.05 }, garden_entrance: { x: 30.4, z: -22.5 },
} as const;

const RAW_EDGES: [NodeId, NodeId][] = [
  ["plaza","hollow_jct"], ["hollow_jct","hollow_entrance"],
  ["plaza","workbench_jct"], ["workbench_jct","workbench_entrance"],
  ["plaza","garden_jct"], ["garden_jct","garden_entrance"],
];
const adj = new Map<NodeId, NodeId[]>();
for (const [a, b] of RAW_EDGES) {
  (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
  (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
}

export function bfsPath(start: NodeId, goal: NodeId): NodeId[] {
  if (start === goal) return [start];
  const prev = new Map<NodeId, NodeId | null>([[start, null]]);
  const q: NodeId[] = [start];
  while (q.length) {
    const cur = q.shift()!;
    for (const nb of adj.get(cur) ?? []) {
      if (prev.has(nb)) continue;
      prev.set(nb, cur);
      if (nb === goal) {
        const path: NodeId[] = []; let n: NodeId | null = nb;
        while (n !== null) { path.unshift(n); n = prev.get(n) ?? null; }
        return path;
      }
      q.push(nb);
    }
  }
  return [];
}

/** FSM Place string â†’ graph "front door" node. Keyed by string so it tolerates
 *  Place values the union does not yet name (garden/hollow land here in V-2.5). */
export const PLACE_ENTRY: Readonly<Record<string, NodeId>> = {
  home: "plaza", workbench: "workbench_entrance", pool: "plaza",
  garden: "garden_entrance", hollow: "hollow_entrance",
};

export function nearestNode(p: Vec2): NodeId {
  let best: NodeId = "plaza", bestD = Infinity;
  for (const [id, n] of Object.entries(NODES) as [NodeId, Vec2][]) {
    const d = Math.hypot(p.x - n.x, p.z - n.z);
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}

export interface RoadGeometryData {
  positions: Float32Array; normals: Float32Array; colors: Float32Array; index: Uint32Array;
}
const COB_R = 0x4a/255, COB_G = 0x40/255, COB_B = 0x35/255; // VILLAGE.roadCobble
export function buildRoadGeometry(road: RoadSpec): RoadGeometryData {
  const dx = road.toX - road.fromX, dz = road.toZ - road.fromZ;
  const len = Math.hypot(dx, dz), nx = dz/len, nz = -dx/len, hw = road.width/2;
  const steps = Math.ceil(len/road.segmentLen) + 1, vc = steps * 2;
  const positions = new Float32Array(vc*3), normals = new Float32Array(vc*3),
        colors = new Float32Array(vc*3); const index: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i/(steps-1), cx = road.fromX + dx*t, cz = road.fromZ + dz*t;
    const lx = cx + nx*hw, lz = cz + nz*hw, ly = islandHeight(lx, lz, ISLAND_MAX_R) + 0.04;
    const rx = cx - nx*hw, rz = cz - nz*hw, ry = islandHeight(rx, rz, ISLAND_MAX_R) + 0.04;
    const li = i*2, ri = i*2+1;
    positions.set([lx,ly,lz], li*3); positions.set([rx,ry,rz], ri*3);
    normals.set([0,1,0], li*3); normals.set([0,1,0], ri*3);
    colors.set([COB_R,COB_G,COB_B], li*3); colors.set([COB_R,COB_G,COB_B], ri*3);
    if (i < steps-1) index.push(li, ri, li+2, ri, ri+2, li+2);
  }
  return { positions, normals, colors, index: new Uint32Array(index) };
}
```

`Vec2` is imported from the already-exported `locomotion.ts` type.

---

## 4. Place â†’ building mapping

| Surface (place id) | Label / route | Building kind | Center (x, z) | Verified h | Pet anchor (x, z) | Anchor h |
|---|---|---|---|---|---|---|
| `hollow` | The Hollow `/chat` | **tavern/inn** (fireplace) | (-35, -17.5) | 1.146 | (-33.8, -16.8) | 1.272 |
| `workbench` | The Workbench `/notes` | **forge/workshop** | (-28, 26.6) | 1.326 | (-27.2, 25.8) | 1.753 |
| `garden` | Memory Garden `/memory` | **greenhouse/shrine** | (31.5, -23.1) | 1.528 | (30.4, -22.5) | 1.441 |
| â€” (`PLAZA_POS`) | hub, pet home | **hearth/bonfire + well** | (-7, -7) | 2.088 | home (-5.8, -6.3) | 2.317 |
| `pool` (existing) | wander only | â€” | (38.5, 24.5) | 1.346 | (37.4, 23.9) | â€” |

All centers/anchors match the existing `placeDefs`/`ANCHORS` positions **except `home`**, which relocates to the plaza (Â§2.4). The procedural building wraps each existing marker (marker fire/bench geometry becomes diegetic detail inside/beside the building).

**Building geometry intent (procedural, dusk-recolored):**
- **Tavern**: timber box body, peaked two-panel roof, stone chimney, two ember windows + hanging door lantern, fireplace glow (reuses the Hollow fire marker).
- **Forge/workshop**: stockier stone base + timber upper, prominent forge chimney whose ember top flares when `lumen.mode === "work"`, a cyan (`WORLD.botEye`) work window, an exterior anvil.
- **Greenhouse/shrine**: 6-sided translucent `WORLD.garden` glass prism on a stone ring, peaked translucent cap, interior ember-crystal cluster, arched entrance, ring of glow-mushrooms.

`Html` label Y rises from `~1.15` to `~3.4` (buildings ~2.5â€“3 units tall). Keyboard/`aria-label` contract unchanged (real focusable `<button>`, `onFocus/onBlur` mirror hover, `onClick â†’ open(place.route)`).

---

## 5. Road pathing & locomotion upgrade

The pet walks the road graph instead of beelining. Pure pathing in `roadGraph.ts`; a `PathFollower` class appended to `locomotion.ts`; ~12-line wire-in in `Lumenform3D.tsx`. `arrive()`, `placeTarget()`, `WALK_SPEED`, `DECEL_DIST`, `ARRIVE_DIST`, `Vec2`, `Velocity` are **UNCHANGED**.

### 5.1 `ANCHORS` change in `locomotion.ts`

Only `home` moves; `Place` union stays as-is (no widening in the first cut).

```ts
const ANCHORS: Record<Exclude<Place, "wander">, Vec2> = {
  home:      { x: -5.8, z: -6.3 },                                      // CHANGED â†’ plaza hearth
  workbench: { x: -4 * WORLD_SCALE + 0.8, z: 3.8 * WORLD_SCALE - 0.8 }, // unchanged
  pool:      { x: 5.5 * WORLD_SCALE - 1.1, z: 3.5 * WORLD_SCALE - 0.6 },// unchanged
};
```

`worldScale.test.ts` iterates `["home","workbench","pool"]`; `home (-5.8,-6.3)` height 2.317 passes `0.3 < y < 5`.

### 5.2 `PathFollower` (append to `locomotion.ts`)

```ts
import { bfsPath, NODES, PLACE_ENTRY, nearestNode } from "./roadGraph";

const NODE_ARRIVE = 2.8; // switch waypoints this close â€” rounds corners, no dead stop

export class PathFollower {
  private waypoints: Vec2[] = [];
  private idx = 0;
  get onRoad(): boolean { return this.waypoints.length > 0; }

  planTo(cur: Vec2, place: string): boolean {
    if (place === "wander") { this.clear(); return false; }
    const entry = PLACE_ENTRY[place];
    if (!entry) { this.clear(); return false; }
    const ids = bfsPath(nearestNode(cur), entry);
    if (!ids.length) { this.clear(); return false; }
    this.waypoints = ids.map((id) => NODES[id]);
    const first = this.waypoints[0];
    if (Math.hypot(cur.x - first.x, cur.z - first.z) < NODE_ARRIVE) this.waypoints.shift();
    this.idx = 0;
    return this.waypoints.length > 0;
  }

  step(cur: Vec2): Vec2 | null {
    if (this.idx >= this.waypoints.length) return null;
    const wp = this.waypoints[this.idx];
    if (Math.hypot(cur.x - wp.x, cur.z - wp.z) <= NODE_ARRIVE) {
      this.idx++;
      return this.idx < this.waypoints.length ? this.waypoints[this.idx] : null;
    }
    return wp;
  }
  clear(): void { this.waypoints = []; this.idx = 0; }
}
```

### 5.3 Wire-in in `Lumenform3D.tsx` (the only edit to this file)

Add two refs near the existing ref block:
```ts
const pathFollower = useRef(new PathFollower());
const lastPlace = useRef<string>("home");
```
Replace the single-target line with path-aware resolution; the `arrive()` call + integration after it are **identical**:
```ts
const lured = activeLure(lure, performance.now(), lumen.mode, reduced);

if (lumen.place !== lastPlace.current && !lured) {
  lastPlace.current = lumen.place;
  pathFollower.current.planTo(pos.current, lumen.place);
}

let target: Vec2;
if (lured) {
  target = lured;                                   // cursor lure overrides the road
} else {
  const roadTarget = pathFollower.current.step(pos.current);
  target = roadTarget ?? placeTarget(lumen.place, lumen.wanderSeed); // road, else direct
}
// ... existing: const want = arrive(pos.current, target, WALK_SPEED); integrate as before
```
Facing/lean (`Math.atan2(vel.vx, vel.vz)`) is unchanged â€” it tracks the current segment and curves the lean organically. **Reduced-motion path is unchanged** (snaps to `placeTarget()`, never touches the graph).

### 5.4 Fallbacks

| Condition | Behaviour |
|---|---|
| `bfsPath` returns `[]` (shouldn't on a connected tree) | `planTo` â†’ false â†’ direct `placeTarget()`. No crash. |
| Pet off-road after a wander seed | `nearestNode` joins the closest node, then follows the road. |
| `place === "pool"` â†’ entry `"plaza"` | Walks to plaza, then `placeTarget("pool")` resolves the pool anchor directly. |
| `place === "wander"` | Bypasses the road graph (existing wander). |
| Reduced-motion | Road graph bypassed; existing snap. |

**Perf**: `bfsPath`/`nearestNode` run only on FSM place change (O(13)/O(7)); `step()` is O(1) per frame, zero alloc. One `PathFollower` per mount.

---

## 6. Assets & the bioluminescent recolor/lighting recipe

### 6.1 First cut â€” procedural, no GLBs
Buildings, plaza, hearth, roads are procedural meshes in `Village3D.tsx` using only palette tokens. No texture loads, no `useGLTF`, no Draco. Ships today.

### 6.2 Palette additions â€” `frontend/src/world3d/palette.ts` (ADD only)
```ts
export const VILLAGE = {
  stoneDark:   0x2a2730, stoneHi: 0x3a3545, timberDark: 0x2e2016,
  roofDark:    0x1a1520, plazaCobble: 0x3e3b30, roadCobble: 0x4a4035,
  fenceWood:   0x4a3822,
} as const;
```

### 6.3 Emissive token assignments (the "second skin" of glow)

| Element | color | emissive | base intensity | flatShading | notes |
|---|---|---|---|---|---|
| Tavern/forge windows | `WORLD.ember` | `WORLD.ember` | 1.1 (Ã—glowBoost) | false | hover â†’ ~2.2 |
| Forge work window | `WORLD.botEye` | `WORLD.botEye` | 0.8 (Ã—glowBoost) | false | brightens on `work` |
| Door / hanging lanterns | `WORLD.emberHi` | `WORLD.emberHi` | 1.8 (Ã—glowBoost) | false | bloom carriers |
| Greenhouse glass + crystals | `WORLD.garden` | `WORLD.garden` | 0.45â€“1.2 (Ã—glowBoost) | false | `DoubleSide`, transparent |
| Iron/trim seams | `WORLD.ember` | `WORLD.ember` | 0.3 | true | low-key warm rim |
| Stone-wall seam (opt.) | `VILLAGE.stoneDark` | `WORLD.rim` | 0.05 | true | barely-there cool seam |
| Roof | `VILLAGE.roofDark` | â€” | 0 | true | silhouette vs indigo fog |
| Timber | `VILLAGE.timberDark` | â€” | 0 | true | â€” |
| Plaza disc / roads | `VILLAGE.plazaCobble` / `roadCobble` | â€” | 0 | true | `receiveShadow`, no cast |

All emissive intensities are animated each frame by the **existing** `glowBoost(sky.dayness)` (`daylight.ts`) â€” same mechanism as `GlowMushrooms3D`/`Crystals3D`/`SporeGate3D`. Store base in `material.userData.emissiveBase`; one `useFrame` in `Village3D.tsx` multiplies by `glowBoost` (plus optional lantern flicker `0.88 + 0.12*sin(t*1.4+i)` when `!reduced`). Zero per-frame allocation.

### 6.4 Per-building point lights (budget-capped)

| Light | color | base intensity | distance | decay |
|---|---|---|---|---|
| Tavern | `WORLD.ember` | 2.8 | 7 | 2 |
| Forge | `WORLD.ember` | 2.2 (â†’~5 on `work`) | 6 | 2 |
| Greenhouse | `WORLD.garden` | 1.8 | 5 | 2 |
| Plaza hearth | `WORLD.ember` | 5 (â†’9 when `lumen.place==="home"`) + flicker | 12 | 2 |

### 6.5 `Atmosphere` is UNCHANGED
Existing warm key / cool rim / indigo hemisphere / cool ambient rig already produces dusk. At hour â‰ˆ 18.5 (`dayness â‰ˆ 0.45`) stone reads dark indigo, roofs silhouette, windows glow amber. Existing fog dissolves the island edge with buildings (radius ~35) inside the envelope.

### 6.6 Later GLB swap (additive, Â§11)
When KayKit (`Tavern/Forge/Greenhouse/Fence_Wood/Well/Lantern`) and Kenney (road tiles) GLBs are vendored to `public/models/village/`, only the building sub-components in `Village3D.tsx` change: `useGLTF` + `scene.clone(true)` + per-mesh material override (`classifyMesh` by KayKit's consistent mesh names â†’ the Â§6.3 role table). Fences become instanced via `nature/InstancedModel.tsx`. `villageLayout.ts`, `roadGraph.ts`, the data model, and locomotion are untouched. Defer Draco to the unified V-3 sweep.

---

## 7. Performance & low-end rules

- **Draw-call budget**: roads 3, plaza disc 1, hearth ~5, three buildings ~9, optional first-cut fences â‰¤4, procedural lanterns â‰¤3 â†’ **â‰ˆ22â€“25** added on top of ~200â€“250. Within budget.
- **Point lights**: +4 always-on (3 buildings + plaza), forge +1 conditional. Mirrors existing discipline (mushroom `LIT=3`). If FPS dips on low tier, drop building point lights â€” emissive materials read without cast lighting.
- **No new textures, no GLBs, no Draco in the first cut.** Zero texture uploads.
- **Static geometry, demand-friendly**: only the single glow-sweep `useFrame`. Under `frameloop="demand"` it renders correctly. No reduced-motion special-casing (flicker gates on `!reduced`).
- **Shadows**: buildings cast+receive; roads/plaza disc no cast; transparent greenhouse glass never casts/receives. Directional frustum unchanged.
- **Source-size delta**: ~2â€“4 kB gz; world chunk â‰¤ 350 kB gz.
- **GPU-tier hook (V-2.5)**: gate building lights with `{tier !== 'low' && <pointLight .../>}` â€” one-liner, accommodated.

---

## 8. File-by-file change map + first-cut build order

### ADDED
| File | Purpose |
|---|---|
| `frontend/src/world3d/villageLayout.ts` | Pure: `BUILDING_DEFS`, `VILLAGE_ROADS`, clear radii â€” DERIVED from `PLACES_3D` + `PLAZA_POS`. |
| `frontend/src/world3d/roadGraph.ts` | Pure: `NODES`, edges, `bfsPath`, `nearestNode`, `PLACE_ENTRY`, `buildRoadGeometry`. |
| `frontend/src/world3d/Village3D.tsx` | Renderer: plaza disc + hearth, 3 road strips, 3 procedural buildings, lanterns, one glow `useFrame`. |
| `frontend/src/world3d/villageLayout.test.ts` | Vitest: buildings/anchors on land & within radius; road samples on land; node ids unique; `bfsPath` correctness; `PathFollower` advance. |

### CHANGED (surgical)
| File | Change | Preserved |
|---|---|---|
| `placeDefs.ts` | ADD `export const PLAZA_POS = on(-1*W,-1*W)`. | `PLACES_3D` + its test. |
| `palette.ts` | ADD `VILLAGE` token block. | All `WORLD` tokens. |
| `locomotion.ts` | `ANCHORS.home â†’ {x:-5.8,z:-6.3}`; append `PathFollower` (+ roadGraph import). | `arrive`, `placeTarget`, speeds, `Place` union, other anchors. |
| `Lumenform3D.tsx` | Add 2 refs; swap single-target line for path-aware resolution (~12 lines). | All hover/glow/face/shadow/gesture/integration. |
| `Island.tsx` | Add plaza clear zone `{x:-7,z:-7,r:5.5}`; bump 3 building `CLEAR_ZONES` `2.4 â†’ 4.0`. | Terrain mesh, sea, pool, scatter, MEADOW_R. |
| `Postfx.tsx` | `luminanceThreshold 0.72 â†’ 0.90`. | Everything else. |
| `World3D.tsx` | Import + mount `<Village3D reduced={reduced} />` between `<Island/>` and `<GlowMushrooms3D/>`. | Camera rig, OrbitControls, other children, Canvas gl. |

### UNCHANGED (verified read-only)
`terrain.ts`, `Atmosphere.tsx`, `useWeather.ts`, `weather.ts`, `daylight.ts`, `celestial.ts`, `Clouds3D.tsx`, `Rain3D.tsx`, `Sky3D.tsx`, `Particles3D.tsx` + `particles/flow.ts`, `Crystals3D.tsx` + `crystalPlacement.ts`, `GlowMushrooms3D.tsx`, `SporeGate3D.tsx`, `Pulses3D.tsx`, `Places3D.tsx`*, `petPosition.ts`, `petAnim.ts`, `nature/InstancedModel.tsx`, `nature/models.ts`, `state/worldStore.ts`, `state/worldNavStore.ts`, `world/places.ts`, `world/entities/lumenform/LumenformFSM.ts`, all existing tests.

*`Places3D.tsx`: first cut leaves markers as the clickable hitboxes; buildings in `Village3D` are decorative around them. Replacing markers with interactive buildings is a later pass (Â§11), not required to ship.

### First-cut build order (tests green at every step)
1. **Pure modules, no render**: add `PLAZA_POS`; create `villageLayout.ts`, `roadGraph.ts`, `villageLayout.test.ts`. Run vitest (`placeDefs`, `worldScale`, new suite) â†’ green.
2. **Palette + locomotion**: add `VILLAGE` tokens; change `ANCHORS.home`; append `PathFollower`. Run `locomotion`, `worldScale` â†’ green.
3. **Lumenform3D wire-in**: 2 refs + path-aware target. Build check.
4. **Island clear zones** + **Postfx threshold**. Build check.
5. **Village3D.tsx**: plaza disc + hearth, roads, buildings, lanterns, glow `useFrame`.
6. **World3D.tsx**: mount `<Village3D/>`.
7. **Visual QA** (Â§10).

---

## 9. What must NOT break
- The eased diorama camera (`CameraRig`) â€” zero edits to camera code.
- Terrain (`islandHeight`, `WORLD_SCALE`, `ISLAND_MAX_R`) and the terrain mesh.
- Weather Ã— day/night, bloom, motes, glow.
- Memory crystals (`Crystals3D`) and placement.
- Pet locomotion math (`arrive`, `placeTarget`, speeds) + `petPosition` singleton.
- `Places3D` keyboard parity (focusable buttons, `aria-label`, `onClick â†’ open(route)`).
- `worldStore` SSEâ†’FSM pipeline and `LumenformFSM` (unchanged â†’ tests green).
- All 25 existing vitest suites â€” specifically `placeDefs.test.ts` (array equality), `worldScale.test.ts` (`home`/`workbench`/`pool` on land), `locomotion.test.ts`, `LumenformFSM.test.ts` (`memory-formed` plants in place).
- Low-end target: instancing discipline, `dpr` cap `[1,1.75]`, `antialias:false`, 60 fps.

---

## 10. Verification checklist

**Functional**
- [ ] `npm run build` â€” no TS errors.
- [ ] `npm run test` â€” all 25 suites green; new `villageLayout.test.ts` green.
- [ ] `placeDefs.test.ts` still asserts exactly `["garden","hollow","workbench"]` (PLAZA_POS separate).
- [ ] `worldScale.test.ts` â€” `home (-5.8,-6.3)` passes `0.3 < y < 5` (sampled 2.317).
- [ ] Pet rests at plaza, walks the road to the Workbench on `tool-start`, returns to plaza on `done`.
- [ ] Pet curves through junctions (no dead-stop); lean organic.
- [ ] Cursor lure still overrides road travel.
- [ ] Reduced-motion: snaps to anchors, road graph bypassed, no flicker.
- [ ] Day/night changes window/lantern/hearth glow via `glowBoost`.

**Art (screenshot at hour 18.5, reduced=false)**
- [ ] Stone dark indigo (not warm tan/white); roofs near-black silhouettes.
- [ ] Windows amber, blooming slightly; lanterns warm ember along dark cobble roads.
- [ ] Greenhouse glass + interior crystals glow `WORLD.garden`.
- [ ] Mushrooms (cyan/violet) + crystals read as the same bioluminescent layer.
- [ ] Overall: warm amber (windows/lanterns/pet) vs cool dark (stone/sky/fog) + cyan/violet â€” "magical dusk hamlet," not daytime RPG.

**Performance**
- [ ] 60 fps on Intel UHD 620-class.
- [ ] New draw calls â‰ˆ 22â€“25; new always-on point lights â‰¤ 4 (+1 conditional).
- [ ] No texture uploads; no GLB loads in the first cut.
- [ ] World chunk â‰¤ 350 kB gz.

---

## 11. Sequencing with V-2 / V-3 / V-2.5
- **V-2 (pet)**: independent. Locomotion change is additive (`PathFollower`); pet pose/anim untouched.
- **V-3 (props pass)**: the GLB swap (Â§6.6) lives here â€” vendor KayKit/Kenney GLBs + the unified Draco/LOD sweep (covers nature AND village together). Only `Village3D.tsx` building sub-components change; data model frozen. New `villageModels.ts` mirrors `nature/models.ts` (zero collision).
- **V-2.5 (hardening)** dovetails and is DEFERRED from the first cut:
  - **placeRegistry consolidation**: `villageLayout.ts` switches to import from the registry instead of `placeDefs.ts` â€” one-line change. First cut derives from `PLACES_3D` so it ships without waiting.
  - **Toolâ†’place routing**: widen `Place` (+`garden`/`hollow`), add `toolCategoryToPlace()`, route `memory-formed â†’ place:"garden"` and update `LumenformFSM.test.ts`. `PLACE_ENTRY` already has those keys â†’ no roadGraph change.
  - **GPU-tier ladder**: gate building lights + bloom by tier (one-liners, Â§7).
  - **petAnim wiring / audio**: orthogonal.

---

### Critical files for implementation
- `D:\AI Pet Companion v1\frontend\src\world3d\Village3D.tsx` (new)
- `D:\AI Pet Companion v1\frontend\src\world3d\villageLayout.ts` (new)
- `D:\AI Pet Companion v1\frontend\src\world3d\roadGraph.ts` (new)
- `D:\AI Pet Companion v1\frontend\src\world3d\placeDefs.ts` (add `PLAZA_POS`)
- `D:\AI Pet Companion v1\frontend\src\world3d\locomotion.ts` (`ANCHORS.home` + `PathFollower`)
- `D:\AI Pet Companion v1\frontend\src\world3d\Lumenform3D.tsx` (path-follower wire-in)
- `D:\AI Pet Companion v1\frontend\src\world3d\Island.tsx` (clear zones)
- `D:\AI Pet Companion v1\frontend\src\world3d\Postfx.tsx` (bloom threshold)
- `D:\AI Pet Companion v1\frontend\src\world3d\palette.ts` (`VILLAGE` tokens)
- `D:\AI Pet Companion v1\frontend\src\world3d\World3D.tsx` (mount)

---

**Note on plan-mode constraint:** I could not write to `D:\AI Pet Companion v1\docs\WORLD-VILLAGE.md` directly (plan mode permits writing only to the plan file). The full doc body above is also saved at `C:\Users\Arghya Chowdhury\.claude\plans\i-am-looking-to-virtual-manatee-agent-a234ae30454119b5f.md`. When you approve, the implementing agent should save this content to `D:\AI Pet Companion v1\docs\WORLD-VILLAGE.md`.

**Material contradictions I resolved** (do not re-litigate): plaza at `(-7,-7)` not origin (origin h=3.295 is on the rock band); place ids NOT renamed (breaks `placeDefs.test.ts`); FSM `memory-formed` NOT rerouted in first cut (breaks `LumenformFSM.test.ts`); `Place`-type widening + placeRegistry consolidation deferred to V-2.5; buildings procedural first, GLB swap later.
