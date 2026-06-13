/** locomotion — the companion's planar navigation on the island, as pure math
 *  (no three, no terrain, no GPU). The FSM decides *where* (a Place / a wander
 *  seed); this turns that intent into a ground target (x, z) and steps the body
 *  toward it at a walking pace, reporting a heading to face and whether it's still
 *  moving. The renderer adds terrain height + pose. Pure → unit-tested in Node. */

import { mulberry32 } from "../world/engine/rng";
import type { Place } from "../world/places";

export interface Vec2 {
  x: number;
  z: number;
}

export interface Step {
  x: number;
  z: number;
  heading: number; // radians, rotation about +Y so the body's +Z faces travel
  moving: boolean;
}

/** Ground anchors for the fixed Places, in world units on the island. These sit
 *  *beside* the diegetic markers (placeDefs) so the pet stands next to the fire /
 *  bench rather than inside it. `wander` is resolved from a seed, not here. */
const ANCHORS: Record<Exclude<Place, "wander">, Vec2> = {
  home: { x: 1.6, z: 2.6 }, // its resting spot near the Hollow
  workbench: { x: -3.0, z: 2.0 }, // beside the Workbench marker
  pool: { x: 3.2, z: 0.6 },
};

export const WALK_SPEED = 1.6; // world units / second — an unhurried stroll
const ARRIVE_DIST = 0.12; // within this of the target → "arrived"

/** Resolve an FSM Place (plus a wander seed) to a ground target. Deterministic:
 *  the same wander seed always picks the same spot. Wander stays in a mid radius
 *  band so it lands on grass, never out past the waterline. */
export function placeTarget(place: Place, wanderSeed = 1): Vec2 {
  if (place === "wander") {
    const r = mulberry32(wanderSeed >>> 0);
    const angle = r() * Math.PI * 2;
    const radius = 2 + r() * 2.2; // 2.0 .. 4.2
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }
  return ANCHORS[place];
}

/** Step `cur` toward `target` by at most `speed * dt`. Returns the new position,
 *  a heading facing the target, and whether it's still travelling. On arrival it
 *  snaps to the target, reports `moving: false`, and keeps the previous heading
 *  (so an idle pet doesn't spin). */
export function stepToward(
  cur: Vec2,
  target: Vec2,
  dt: number,
  speed: number,
  prevHeading: number,
): Step {
  const dx = target.x - cur.x;
  const dz = target.z - cur.z;
  const dist = Math.hypot(dx, dz);

  if (dist <= ARRIVE_DIST) {
    return { x: target.x, z: target.z, heading: prevHeading, moving: false };
  }

  const stepLen = Math.min(dist, speed * dt);
  return {
    x: cur.x + (dx / dist) * stepLen,
    z: cur.z + (dz / dist) * stepLen,
    heading: Math.atan2(dx, dz),
    moving: true,
  };
}
