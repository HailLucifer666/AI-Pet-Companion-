/** placeRegistry â€” unified diegetic locations for the Grove.
 *  Merges places.ts, placeDefs.ts, and locomotion anchors into a single truth.
 *  Contains 3D coordinates for the interactive markers (Places3D), navigation
 *  metadata (routes, labels), and locomotion anchors (where the pet stands).
 */

import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
import { mulberry32, range } from "../world/engine/rng";
import { REALMS, type RealmId } from "./realmData";

const W = WORLD_SCALE;

function on(x: number, z: number): [number, number, number] {
  return [x, islandHeight(x, z, ISLAND_MAX_R), z];
}

export type Place = "hollow" | "workbench" | "garden" | "pool" | "wander" | "archives" | "tasks" | "calendar";

export interface PlaceEntry {
  id: Exclude<Place, "wander">;
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
  hollow: {
    id: "hollow",
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
  archives: {
    id: "archives",
    label: "The Archives",
    sub: "formal documents",
    route: "/documents",
    pos: on(-1 * W, -6 * W),
    anchor: { x: -1 * W + 0.8, z: -6 * W + 0.8 },
    navigable: true,
    nx: 0.8,
    ny: 0.8,
  },
  tasks: {
    id: "tasks",
    label: "The Wishing Well",
    sub: "chores & goals",
    route: "/tasks",
    pos: on(-7 * W, 1 * W),
    anchor: { x: -7 * W + 0.8, z: 1 * W + 0.8 },
    navigable: true,
    nx: 0.2,
    ny: 0.8,
  },
  calendar: {
    id: "calendar",
    label: "The Standing Stone",
    sub: "schedule & time",
    route: "/calendar",
    pos: on(1 * W, 5.5 * W),
    anchor: { x: 1 * W - 0.8, z: 5.5 * W - 0.8 },
    navigable: true,
    nx: 0.8,
    ny: 0.2,
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

export const ALL_PLACES: PlaceEntry[] = Object.values(PLACES);
export const ALL_NAV_PLACES: PlaceEntry[] = ALL_PLACES.filter((p) => p.navigable);

export function getRealmPlaces(realmId: RealmId): PlaceEntry[] {
  const def = REALMS[realmId];
  return ALL_NAV_PLACES.filter((p) => def.places.includes(p.id as Place));
}

/** Where a Mycelium pulse originates, by the kind of event that fired it. */
export type PulseOrigin = "workbench" | "garden" | "hollow";

export function originCoord(origin: PulseOrigin): [number, number, number] {
  return PLACES[origin].pos;
}

export function originCoord2D(origin: PulseOrigin, w: number, h: number): { x: number; y: number } {
  const p = PLACES[origin];
  return { x: (p.nx || 0.5) * w, y: (p.ny || 0.5) * h };
}

/** The Spore Gate — the luminous archway high in the Grove that fills with the
 *  companion's XP and blooms open when it widens to a new stage (W-7). */
export const SPORE_GATE = { x: 0, y: 15, z: -10 * W, nx: 0.5, ny: 0.3 };

export function gateCoord(w: number, h: number): { x: number; y: number } {
  return { x: SPORE_GATE.nx * w, y: SPORE_GATE.ny * h };
}

export function resolvePlace(
  place: Place,
  w: number,
  h: number,
  wanderSeed = 1,
): { x: number; y: number } {
  if (place === "wander") {
    const r = mulberry32(wanderSeed >>> 0);
    return { x: range(r, 0.22, 0.78) * w, y: range(r, 0.66, 0.84) * h };
  }
  const p = PLACES[place];
  return { x: (p.nx || 0.5) * w, y: (p.ny || 0.5) * h };
}
