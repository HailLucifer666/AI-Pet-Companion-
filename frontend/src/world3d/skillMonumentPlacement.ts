/** skillMonumentPlacement â€” pure placement for the village's skill monuments.
 *
 *  Each approved (active) skill earns a small monument ringing the forge. The spot
 *  is deterministic from the skill's index (an even ring) + a per-id jitter, so a
 *  skill always stands in the same place. Grounded on the island via islandHeight,
 *  with a two-step fallback if the first spot lands in water or on a peak. No three
 *  imports â†’ unit-testable. Mirrors crystalPlacement's determinism. */

import { mulberry32 } from "../world/engine/rng";
import { islandHeight, ISLAND_MAX_R } from "./terrain";

const MAX_MONUMENTS = 12; // one ring; beyond this the angle wraps (indices mod 12)
const MIN_GRASS = 0.4;
const MAX_GRASS = 3.2;

/** Deterministic ground spot for a skill monument, ringing the forge at radius 6â€“8. */
export function skillMonumentPosition(
  skillIndex: number,
  skillId: number,
  forgeX: number,
  forgeZ: number,
  maxR = ISLAND_MAX_R,
): { x: number; y: number; z: number } {
  const r = mulberry32((skillId ^ 0xb0c0de) >>> 0);
  const baseAngle = ((skillIndex % MAX_MONUMENTS) / MAX_MONUMENTS) * Math.PI * 2;
  const angle = baseAngle + (r() - 0.5) * 0.4; // small per-skill jitter off the even slot
  const radius = 6 + r() * 2; // 6â€“8 units from the forge

  const at = (a: number) => {
    const x = forgeX + Math.cos(a) * radius;
    const z = forgeZ + Math.sin(a) * radius;
    return { x, z, y: islandHeight(x, z, maxR) };
  };

  let p = at(angle);
  if (p.y < MIN_GRASS || p.y > MAX_GRASS) p = at(angle + Math.PI); // try the opposite side
  if (p.y < MIN_GRASS || p.y > MAX_GRASS) p = { ...p, y: islandHeight(forgeX, forgeZ, maxR) }; // forge ground
  return { x: p.x, y: p.y, z: p.z };
}
