/** roadGraph — the cobble-road waypoint graph the companion walks (plaza →
 *  junction → building entrance), plus a procedural terrain-following road-strip
 *  geometry builder. Pure (no three meshes, only math + typed arrays) → unit-
 *  testable. Spoke tree, undirected; BFS finds the unique shortest sequence.
 *
 *  Node coordinates are DERIVED from `WORLD_SCALE` (not hardcoded), so the village
 *  fits the world at any scale: `plaza` = `PLAZA_POS` xz, each `*_entrance` = the
 *  pet anchor beside that building, each `*_jct` = the midpoint between them. */

import type { Vec2 } from "./locomotion";
import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
import type { RoadSpec } from "./villageLayout";

export type NodeId =
  | "plaza"
  | "hollow_jct"
  | "hollow_entrance"
  | "workbench_jct"
  | "workbench_entrance"
  | "garden_jct"
  | "garden_entrance";

const W = WORLD_SCALE;

// Entrances = where the pet stands beside each building (same UNSCALED offsets the
// markers/anchors use), derived from the scaled place centres.
const PLAZA: Vec2 = { x: -1 * W, z: -1 * W };
const HOLLOW_ENT: Vec2 = { x: -5 * W + 1.2, z: -2.5 * W + 0.7 };
const WORKBENCH_ENT: Vec2 = { x: -4 * W + 0.8, z: 3.8 * W - 0.8 };
const GARDEN_ENT: Vec2 = { x: 4.5 * W - 1.1, z: -3.3 * W + 0.6 };

const mid = (a: Vec2, b: Vec2): Vec2 => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });

export const NODES: Readonly<Record<NodeId, Vec2>> = {
  plaza: PLAZA,
  hollow_jct: mid(PLAZA, HOLLOW_ENT),
  hollow_entrance: HOLLOW_ENT,
  workbench_jct: mid(PLAZA, WORKBENCH_ENT),
  workbench_entrance: WORKBENCH_ENT,
  garden_jct: mid(PLAZA, GARDEN_ENT),
  garden_entrance: GARDEN_ENT,
};

const RAW_EDGES: [NodeId, NodeId][] = [
  ["plaza", "hollow_jct"],
  ["hollow_jct", "hollow_entrance"],
  ["plaza", "workbench_jct"],
  ["workbench_jct", "workbench_entrance"],
  ["plaza", "garden_jct"],
  ["garden_jct", "garden_entrance"],
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
        const path: NodeId[] = [];
        let n: NodeId | null = nb;
        while (n !== null) {
          path.unshift(n);
          n = prev.get(n) ?? null;
        }
        return path;
      }
      q.push(nb);
    }
  }
  return [];
}

/** FSM Place string → graph "front door" node. Keyed by string so it tolerates
 *  Place values the union does not yet name (garden/hollow land here in V-2.5). */
export const PLACE_ENTRY: Readonly<Record<string, NodeId>> = {
  home: "plaza",
  workbench: "workbench_entrance",
  pool: "plaza",
  garden: "garden_entrance",
  hollow: "hollow_entrance",
};

export function nearestNode(p: Vec2): NodeId {
  let best: NodeId = "plaza";
  let bestD = Infinity;
  for (const [id, n] of Object.entries(NODES) as [NodeId, Vec2][]) {
    const d = Math.hypot(p.x - n.x, p.z - n.z);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export interface RoadGeometryData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  index: Uint32Array;
}

const COB_R = 0x4a / 255,
  COB_G = 0x40 / 255,
  COB_B = 0x35 / 255; // VILLAGE.roadCobble

/** A flat-ish cobble strip from `from` to `to`, following the terrain height at
 *  each step (so the road drapes over the hills), one draw call. */
export function buildRoadGeometry(road: RoadSpec): RoadGeometryData {
  const dx = road.toX - road.fromX,
    dz = road.toZ - road.fromZ;
  const len = Math.hypot(dx, dz),
    nx = dz / len,
    nz = -dx / len,
    hw = road.width / 2;
  const steps = Math.ceil(len / road.segmentLen) + 1,
    vc = steps * 2;
  const positions = new Float32Array(vc * 3),
    normals = new Float32Array(vc * 3),
    colors = new Float32Array(vc * 3);
  const index: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1),
      cx = road.fromX + dx * t,
      cz = road.fromZ + dz * t;
    const lx = cx + nx * hw,
      lz = cz + nz * hw,
      ly = islandHeight(lx, lz, ISLAND_MAX_R) + 0.04;
    const rx = cx - nx * hw,
      rz = cz - nz * hw,
      ry = islandHeight(rx, rz, ISLAND_MAX_R) + 0.04;
    const li = i * 2,
      ri = i * 2 + 1;
    positions.set([lx, ly, lz], li * 3);
    positions.set([rx, ry, rz], ri * 3);
    normals.set([0, 1, 0], li * 3);
    normals.set([0, 1, 0], ri * 3);
    colors.set([COB_R, COB_G, COB_B], li * 3);
    colors.set([COB_R, COB_G, COB_B], ri * 3);
    if (i < steps - 1) index.push(li, ri, li + 2, ri, ri + 2, li + 2);
  }
  return { positions, normals, colors, index: new Uint32Array(index) };
}
