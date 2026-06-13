/** locomotion — the companion's planar navigation on the island, as pure math
 *  (no three, no terrain, no GPU). The FSM decides *where* (a Place / a wander
 *  seed); this turns that intent into a ground target (x, z) and a *desired
 *  velocity* toward it. The renderer smooths that velocity into the body's motion,
 *  which is what makes walking read as organic rather than rigid: it eases away
 *  from a standstill, slows as it nears its goal (arrival), and turns gradually.
 *  Pure → unit-tested in Node. */

import { mulberry32 } from "../world/engine/rng";
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
const ANCHORS: Record<Exclude<Place, "wander">, Vec2> = {
  home: { x: -4.6, z: -2.2 }, // its resting spot near the Hollow's fire
  workbench: { x: -4.0, z: 3.7 }, // beside the Workbench marker
  pool: { x: 4.4, z: 2.9 }, // at the inland pool's edge
};

export const WALK_SPEED = 1.9; // world units / second — an unhurried stroll
const DECEL_DIST = 1.6; // start easing to a stop within this of the target
const ARRIVE_DIST = 0.1; // closer than this → arrived (zero velocity)

/** Resolve an FSM Place (plus a wander seed) to a ground target. Deterministic:
 *  the same wander seed always picks the same spot. Wander stays in a mid radius
 *  band so it lands on grass, never out past the waterline. */
export function placeTarget(place: Place, wanderSeed = 1): Vec2 {
  if (place === "wander") {
    const r = mulberry32(wanderSeed >>> 0);
    const angle = r() * Math.PI * 2;
    const radius = 2.5 + r() * 3.5; // 2.5 .. 6.0 — on land, with room to roam
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
