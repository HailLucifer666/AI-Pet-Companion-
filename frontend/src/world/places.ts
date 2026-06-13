/** Named locations in the Grove, in normalized coords so they track any canvas
 *  size. The Lumenform walks between them; the Grove draws faint markers at the
 *  same spots so the destinations read. Full diegetic Places (hotspots, portals)
 *  land in W-4 — this is just the shared coordinate vocabulary. */

import { mulberry32, range } from "./engine/rng";

export type Place = "home" | "workbench" | "pool" | "wander";

export const PLACES: Record<Exclude<Place, "wander">, { nx: number; ny: number }> = {
  home: { nx: 0.5, ny: 0.78 }, // by the Hollow's fire
  workbench: { nx: 0.76, ny: 0.66 }, // off to one side, where work happens
  pool: { nx: 0.5, ny: 0.9 },
};

/** The Spore Gate — the luminous archway high in the Grove that fills with the
 *  companion's XP and blooms open when it widens to a new stage (W-7). Mycelium
 *  pulses from real events travel here. */
export const SPORE_GATE = { nx: 0.5, ny: 0.3 };

/** Where a Mycelium pulse originates, by the kind of event that fired it. */
export type PulseOrigin = "workbench" | "garden" | "home";

const GARDEN = { nx: 0.27, ny: 0.64 }; // the Memory Garden node (matches NAV_PLACES)

export function originCoord(origin: PulseOrigin, w: number, h: number): { x: number; y: number } {
  const p = origin === "garden" ? GARDEN : PLACES[origin];
  return { x: p.nx * w, y: p.ny * h };
}

export function gateCoord(w: number, h: number): { x: number; y: number } {
  return { x: SPORE_GATE.nx * w, y: SPORE_GATE.ny * h };
}

/** Navigable Places — a spot in the Grove that opens a surface diegetically.
 *  Coords are normalized; the hotspot DOM buttons sit at the same fractions, so
 *  clicking the Hollow opens Chat "at the fire". The rail still reaches every
 *  surface directly — this is the scenic route, not the only one. */
export interface NavPlace {
  id: string;
  label: string;
  sub: string;
  route: string;
  nx: number;
  ny: number;
}

export const NAV_PLACES: NavPlace[] = [
  { id: "hollow", label: "The Hollow", sub: "talk by the fire", route: "/chat", nx: 0.5, ny: 0.72 },
  { id: "garden", label: "Memory Garden", sub: "what it remembers", route: "/memory", nx: 0.27, ny: 0.64 },
  { id: "workbench", label: "The Workbench", sub: "notes & making", route: "/notes", nx: 0.76, ny: 0.62 },
];

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
  return { x: p.nx * w, y: p.ny * h };
}
