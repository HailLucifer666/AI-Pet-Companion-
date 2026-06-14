/** locomotion — the companion's planar navigation on the island, as pure math
 *  (no three, no terrain, no GPU). The FSM decides *where* (a Place / a wander
 *  seed); this turns that intent into a ground target (x, z) and a *desired
 *  velocity* toward it. The renderer smooths that velocity into the body's motion,
 *  which is what makes walking read as organic rather than rigid: it eases away
 *  from a standstill, slows as it nears its goal (arrival), and turns gradually.
 *  Pure → unit-tested in Node. */

import { mulberry32 } from "../world/engine/rng";
import { WORLD_SCALE } from "./terrain";
import type { Place } from "../world/places";

export interface Vec2 {
  x: number;
  z: number;
}

export interface Velocity {
  vx: number;
  vz: number;
  dist: number; // remaining distance to the target
}

/** Ground anchors for the fixed Places, in world units on the (now larger)
 *  island. These sit *beside* the diegetic markers (placeDefs) so the pet stands
 *  next to the fire / bench / pool rather than inside them, and are spread out so
 *  roaming has real range. Heights are land-verified. `wander` is seed-resolved. */
// Markers scale out across the bigger island (× WORLD_SCALE); the anchor sits a
// small UNSCALED offset beside its marker, so the pet always stands right next to
// the fire / bench / pool — never metres away — however far the cluster is spread.
const ANCHORS: Record<Exclude<Place, "wander">, Vec2> = {
  home: { x: -5 * WORLD_SCALE + 1.2, z: -2.5 * WORLD_SCALE + 0.7 }, // beside the Hollow's fire
  workbench: { x: -4 * WORLD_SCALE + 0.8, z: 3.8 * WORLD_SCALE - 0.8 }, // beside the Workbench
  pool: { x: 5.5 * WORLD_SCALE - 1.1, z: 3.5 * WORLD_SCALE - 0.6 }, // at the inland pool's edge
};

export const WALK_SPEED = 1.9 * 4; // world units / second — an unhurried stroll, scaled up for the bigger world
const DECEL_DIST = 1.6 * 4; // start easing to a stop within this of the target
const ARRIVE_DIST = 0.1; // closer than this → arrived (zero velocity)

/** Resolve an FSM Place (plus a wander seed) to a ground target. Deterministic:
 *  the same wander seed always picks the same spot. Wander stays in a mid radius
 *  band so it lands on grass, never out past the waterline. */
export function placeTarget(place: Place, wanderSeed = 1): Vec2 {
  if (place === "wander") {
    const r = mulberry32(wanderSeed >>> 0);
    const angle = r() * Math.PI * 2;
    // A local roaming region (not the whole island — the cursor-lure pulls it further).
    const radius = 10 + r() * 22; // ~10 .. 32 — on land, around the home cluster
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }
  return ANCHORS[place];
}

/** Desired velocity from `cur` toward `target`: full speed when far, easing down
 *  to zero across the last `DECEL_DIST` so it glides to a stop instead of snapping.
 *  Pure — the renderer integrates and smooths this. */
export function arrive(cur: Vec2, target: Vec2, maxSpeed: number): Velocity {
  const dx = target.x - cur.x;
  const dz = target.z - cur.z;
  const dist = Math.hypot(dx, dz);

  if (dist <= ARRIVE_DIST) return { vx: 0, vz: 0, dist };

  const speed = maxSpeed * Math.min(1, dist / DECEL_DIST);
  return { vx: (dx / dist) * speed, vz: (dz / dist) * speed, dist };
}
