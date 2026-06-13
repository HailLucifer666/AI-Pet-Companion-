/** placeDefs — the navigable Places as fixed spots on the island. Clicking a
 *  Place opens its surface (the same overlay the rail reaches). Positions sit on
 *  the terrain surface (height from the pure terrain module). Pure / no three. */

import { islandHeight, ISLAND_MAX_R } from "./terrain";

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
  { id: "hollow", label: "The Hollow", sub: "talk by the fire", route: "/chat", kind: "hollow", pos: on(-5, -2.5) },
  { id: "garden", label: "Memory Garden", sub: "what it remembers", route: "/memory", kind: "garden", pos: on(4.5, -3.3) },
  { id: "workbench", label: "The Workbench", sub: "notes & making", route: "/notes", kind: "workbench", pos: on(-4, 3.8) },
];
