/** locomotion â€” the companion's planar navigation on the island, as pure math
 *  (no three, no terrain, no GPU). The FSM decides *where* (a Place / a wander
 *  seed); this turns that intent into a ground target (x, z) and a *desired
 *  velocity* toward it. The renderer smooths that velocity into the body's motion,
 *  which is what makes walking read as organic rather than rigid: it eases away
 *  from a standstill, slows as it nears its goal (arrival), and turns gradually.
 *  Pure â†’ unit-tested in Node. */

import { mulberry32 } from "../world/engine/rng";
import { PLACES, type Place } from "./placeRegistry";
import { bfsPath, NODES, PLACE_ENTRY, nearestNode } from "./roadGraph";

export interface Vec2 {
  x: number;
  z: number;
}

export interface Velocity {
  vx: number;
  vz: number;
  dist: number; // remaining distance to the target
}



export const WALK_SPEED = 1.9 * 4; // world units / second â€” an unhurried stroll, scaled up for the bigger world
const DECEL_DIST = 1.6 * 4; // start easing to a stop within this of the target
const ARRIVE_DIST = 0.1; // closer than this â†’ arrived (zero velocity)

/** Resolve an FSM Place (plus a wander seed) to a ground target. Deterministic:
 *  the same wander seed always picks the same spot. Wander stays in a mid radius
 *  band so it lands on grass, never out past the waterline. */
export function placeTarget(place: Place, wanderSeed = 1): Vec2 {
  if (place === "wander") {
    const r = mulberry32(wanderSeed >>> 0);
    const angle = r() * Math.PI * 2;
    // A local roaming region (not the whole island â€” the cursor-lure pulls it further).
    const radius = 10 + r() * 22; // ~10 .. 32 â€” on land, around the home cluster
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }
  return PLACES[place as Exclude<Place, "wander">].anchor;
}

/** Desired velocity from `cur` toward `target`: full speed when far, easing down
 *  to zero across the last `DECEL_DIST` so it glides to a stop instead of snapping.
 *  Pure â€” the renderer integrates and smooths this. */
export function arrive(cur: Vec2, target: Vec2, maxSpeed: number): Velocity {
  const dx = target.x - cur.x;
  const dz = target.z - cur.z;
  const dist = Math.hypot(dx, dz);

  if (dist <= ARRIVE_DIST) return { vx: 0, vz: 0, dist };

  const speed = maxSpeed * Math.min(1, dist / DECEL_DIST);
  return { vx: (dx / dist) * speed, vz: (dz / dist) * speed, dist };
}

/** PathFollower â€” turns "I want to be at <place>" into a sequence of road
 *  waypoints (plaza â†’ junction â†’ entrance) so the companion walks the cobble
 *  roads instead of beelining across the island. Pure state machine over the road
 *  graph; the renderer feeds it the current position and steers `arrive()` toward
 *  whatever waypoint it returns. `wander` and unknown places bypass it (direct). */
const NODE_ARRIVE = 2.8; // switch waypoints this close â€” rounds corners, no dead stop

export class PathFollower {
  private waypoints: Vec2[] = [];
  private idx = 0;

  get onRoad(): boolean {
    return this.waypoints.length > 0;
  }

  /** Plan a route from `cur` to the entrance of `place`. Returns true if a road
   *  was laid (false â†’ caller should target the place directly). */
  planTo(cur: Vec2, place: string): boolean {
    if (place === "wander") {
      this.clear();
      return false;
    }
    const entry = PLACE_ENTRY[place];
    if (!entry) {
      this.clear();
      return false;
    }
    const ids = bfsPath(nearestNode(cur), entry);
    if (!ids.length) {
      this.clear();
      return false;
    }
    this.waypoints = ids.map((id) => NODES[id]);
    const first = this.waypoints[0];
    if (Math.hypot(cur.x - first.x, cur.z - first.z) < NODE_ARRIVE) this.waypoints.shift();
    this.idx = 0;
    return this.waypoints.length > 0;
  }

  /** The current waypoint to walk toward, advancing as `cur` reaches each. Returns
   *  null when the road is finished (caller falls back to the place anchor). */
  step(cur: Vec2): Vec2 | null {
    if (this.idx >= this.waypoints.length) return null;
    const wp = this.waypoints[this.idx];
    if (Math.hypot(cur.x - wp.x, cur.z - wp.z) <= NODE_ARRIVE) {
      this.idx++;
      return this.idx < this.waypoints.length ? this.waypoints[this.idx] : null;
    }
    return wp;
  }

  clear(): void {
    this.waypoints = [];
    this.idx = 0;
  }
}
