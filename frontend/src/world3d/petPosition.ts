/** petPosition — the companion's live world position, written by Lumenform3D
 *  every frame and read by the follow-camera. A plain mutable singleton, kept
 *  deliberately outside React/zustand: per-frame writes must never trigger a
 *  re-render. Both readers live inside the same Canvas, so this is module-local
 *  shared state, not app state. */

import { WORLD_SCALE } from "./terrain";

export const petPos = { x: 1.6 * WORLD_SCALE, y: 1, z: 2.6 * WORLD_SCALE };
