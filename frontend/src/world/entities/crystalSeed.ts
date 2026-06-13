/** crystalSeed — the pure, render-free core of the memory garden.
 *
 *  A memory's crystal is fully determined by its id and type: same memory →
 *  same species, same spot, every launch (the garden never reshuffles). This
 *  module holds only that logic so it can be unit-tested in Node without Pixi;
 *  CrystalField does the drawing.
 */

import type { MemoryType } from "../../lib/api";
import { mulberry32, range } from "../engine/rng";

export interface CrystalSeed {
  id: number; // memory_id
  memoryType: MemoryType;
  seed: number;
  nx: number; // normalized ground position, stable per memory
  ny: number;
}

export const MAX_CRYSTALS = 48;

/** Which species each memory type grows. `tint` names a palette key; `kind`
 *  selects the silhouette. Shape carries the meaning; tint reinforces it but is
 *  never the only cue (legible color-blind and in greyscale). */
export type CrystalKind = "monolith" | "gem" | "grove" | "spire" | "quartz";
export type PaletteTint = "claw500" | "claw400" | "claw300" | "ok" | "warn";

export const SPECIES: Record<MemoryType, { kind: CrystalKind; tint: PaletteTint }> = {
  identity: { kind: "monolith", tint: "claw500" }, // the warm core of self
  preference: { kind: "gem", tint: "ok" },
  project: { kind: "grove", tint: "warn" },
  event: { kind: "spire", tint: "claw300" },
  fact: { kind: "quartz", tint: "claw400" },
};

/** Pure: a memory id + type → its fixed place and shape seed. */
export function makeCrystalSeed(id: number, memoryType: MemoryType): CrystalSeed {
  const seed = id >>> 0 || 1;
  const r = mulberry32(seed);
  return {
    id,
    memoryType,
    seed,
    nx: range(r, 0.18, 0.82),
    ny: range(r, 0.62, 0.86),
  };
}
