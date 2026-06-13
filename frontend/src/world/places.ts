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
