/** placeRegistry â€” unified diegetic locations for the Grove.
 *  Merges places.ts, placeDefs.ts, and locomotion anchors into a single truth.
 *  Contains 3D coordinates for the interactive markers (Places3D), navigation
 *  metadata (routes, labels), and locomotion anchors (where the pet stands).
 */

import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";

const W = WORLD_SCALE;

function on(x: number, z: number): [number, number, number] {
  return [x, islandHeight(x, z, ISLAND_MAX_R), z];
}

export type Place = "home" | "workbench" | "garden" | "pool" | "wander";

export interface PlaceEntry {
  id: Place;
  label: string;
  sub: string;
  route: string;
  pos: [number, number, number]; // 3D marker coordinate
  anchor: { x: number; z: number }; // where the pet stands next to it
  navigable: boolean; // if true, it has an interactive UI marker
  nx?: number; // 2D normalized coord
  ny?: number;
}

export const PLAZA_POS: [number, number, number] = on(-1 * W, -1 * W);

export const PLACES: Record<Exclude<Place, "wander">, PlaceEntry> = {
  home: {
    id: "home",
    label: "The Hollow",
    sub: "talk by the fire",
    route: "/chat",
    pos: on(-5 * W, -2.5 * W),
    anchor: { x: -1 * W + 1.2, z: -1 * W + 0.7 },
    navigable: true,
    nx: 0.5,
    ny: 0.78,
  },
  garden: {
    id: "garden",
    label: "Memory Garden",
    sub: "what it remembers",
    route: "/memory",
    pos: on(4.5 * W, -3.3 * W),
    anchor: { x: 4.5 * W - 1.1, z: -3.3 * W + 0.6 },
    navigable: true,
    nx: 0.27,
    ny: 0.64,
  },
  workbench: {
    id: "workbench",
    label: "The Workbench",
    sub: "notes & making",
    route: "/notes",
    pos: on(-4 * W, 3.8 * W),
    anchor: { x: -4 * W + 0.8, z: 3.8 * W - 0.8 },
    navigable: true,
    nx: 0.76,
    ny: 0.66,
  },
  pool: {
    id: "pool",
    label: "Inland Pool",
    sub: "",
    route: "",
    pos: on(5.5 * W, 3.5 * W),
    anchor: { x: 5.5 * W - 1.1, z: 3.5 * W - 0.6 },
    navigable: false,
    nx: 0.5,
    ny: 0.9,
  },
};

export const NAV_PLACES: PlaceEntry[] = Object.values(PLACES).filter((p) => p.navigable);
export const PLACES_3D: PlaceEntry[] = NAV_PLACES;

/** Where a Mycelium pulse originates, by the kind of event that fired it. */
export type PulseOrigin = "workbench" | "garden" | "home";

export function originCoord(origin: PulseOrigin): [number, number, number] {
  return PLACES[origin].pos;
}

/** The Spore Gate â€” the luminous archway high in the Grove that fills with the
 *  companion's XP and blooms open when it widens to a new stage (W-7). */
export const SPORE_GATE = { x: 0, y: 15, z: -10 * W, nx: 0.5, ny: 0.3 };

export function gateCoord(w: number, h: number): { x: number; y: number } {
  return { x: SPORE_GATE.nx * w, y: SPORE_GATE.ny * h };
}
