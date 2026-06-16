/** placeDefs — the navigable Places as fixed spots on the island. Clicking a
 *  Place opens its surface (the same overlay the rail reaches). Positions sit on
 *  the terrain surface (height from the pure terrain module). Pure / no three. */

import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";

const W = WORLD_SCALE;

export type PlaceKind = "hollow" | "garden" | "workbench";

export interface Place3D {
  id: string;
  label: string;
  sub: string;
  route: string;
  kind: PlaceKind;
  pos: [number, number, number];
}

function on(x: number, z: number): [number, number, number] {
  return [x, islandHeight(x, z, ISLAND_MAX_R), z];
}

export const PLACES_3D: Place3D[] = [
  { id: "hollow", label: "The Hollow", sub: "talk by the fire", route: "/chat", kind: "hollow", pos: on(-5 * W, -2.5 * W) },
  { id: "garden", label: "Memory Garden", sub: "what it remembers", route: "/memory", kind: "garden", pos: on(4.5 * W, -3.3 * W) },
  { id: "workbench", label: "The Workbench", sub: "notes & making", route: "/notes", kind: "workbench", pos: on(-4 * W, 3.8 * W) },
];

/** The village plaza hub — the central hearth the companion calls home. NOT a
 *  navigable surface, so it stays out of PLACES_3D (which the test array-locks).
 *  Scales with the world like every other position. */
export const PLAZA_POS: [number, number, number] = on(-1 * W, -1 * W);
