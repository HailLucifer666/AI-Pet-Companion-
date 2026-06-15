/** crystalPlacement â€” pure placement + color for memory crystals in the 3D Grove.
 *
 *  Reuses the shared crystalSeed determinism (a memory keeps its id/species/seed)
 *  and derives a fixed 3D spot on the island from that seed: same memory always
 *  grows in the same place, on grass, every launch. No three imports â†’ testable.
 */

import type { MemoryType } from "../lib/api";
import { mulberry32 } from "../world/engine/rng";
import { islandHeight, ISLAND_MAX_R } from "./terrain";

/** Vivid gem colors per memory species (identity stays ember, tying to the pet). */
export const CRYSTAL_COLOR: Record<MemoryType, number> = {
  identity: 0xe2a04a, // ember/amber
  preference: 0x49d39a, // emerald
  project: 0xe6c34a, // gold
  event: 0x8ea2ff, // periwinkle
  fact: 0x6fd6e6, // cyan
};

/** Deterministic ground spot for a crystal seed: a grassy point on the island. */
export function crystalPosition(seed: number, maxR = ISLAND_MAX_R): { x: number; y: number; z: number } {
  const r = mulberry32((seed ^ 0x5eed1e) >>> 0);
  for (let i = 0; i < 10; i++) {
    const ang = r() * Math.PI * 2;
    const rad = (0.22 + r() * 0.62) * maxR;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, maxR);
    if (y > 0.4 && y < 3.2) return { x, y, z };
  }
  return { x: 0, y: islandHeight(0, 0, maxR), z: 0 }; // fallback: the peak
}
