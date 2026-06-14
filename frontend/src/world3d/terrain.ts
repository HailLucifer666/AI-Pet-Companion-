/** terrain — the island's shape, as pure math (no three, no GPU).
 *
 *  A deterministic value-noise heightfield with a radial falloff so the land
 *  rises in the middle and sinks under the water at the edges → an island. Same
 *  every launch. Island.tsx feeds these heights into a low-poly mesh; this stays
 *  pure so it can be unit-tested in Node.
 */

import { mulberry32 } from "../world/engine/rng";

// A fixed lattice of pseudo-random values for value noise (seeded → stable).
const PERM = (() => {
  const r = mulberry32(1337);
  const p = new Float32Array(512);
  for (let i = 0; i < p.length; i++) p[i] = r();
  return p;
})();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function lattice(ix: number, iz: number): number {
  // Hash two ints into the permutation table.
  const h = (Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663)) >>> 0;
  return PERM[h & 511];
}

function valueNoise(x: number, z: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const u = smooth(x - x0);
  const v = smooth(z - z0);
  const n00 = lattice(x0, z0);
  const n10 = lattice(x0 + 1, z0);
  const n01 = lattice(x0, z0 + 1);
  const n11 = lattice(x0 + 1, z0 + 1);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v); // 0..1
}

/** Fractal (layered) value noise, ~0..1. */
export function fbm(x: number, z: number): number {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < 4; o++) {
    total += valueNoise(x * freq, z * freq) * amp;
    norm += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return total / norm;
}

/** Height at world (x, z); land peaks near the origin, sinks past `maxR`. The noise
 *  frequency is in absolute world units, so a larger island (bigger `maxR`) gets
 *  proportionally MORE rolling hills across it — richer terrain to roam, not a
 *  stretched blob. A gentle height bump + a smaller water-dip keep the now much
 *  wider mid-island solidly above the waterline. */
export function islandHeight(x: number, z: number, maxR: number): number {
  const r = Math.min(1, Math.hypot(x, z) / maxR);
  const fall = Math.pow(Math.max(0, 1 - r), 1.7); // 1 at center → 0 at the rim
  const n = fbm((x + 100) * 0.16, (z + 100) * 0.16); // offset so noise isn't centered
  return fall * (1.6 + n * 5.4) - (1 - fall) * 1.4; // dips below 0 (water) at the edges
}

export const WATER_LEVEL = 0;

/** Master spatial scale — every absolute world POSITION/DISTANCE multiplies by this
 *  (island radius, plane, sea, fog, shadow frustum, place/anchor/gate coords, scatter
 *  & weather radii). Object SIZES (tree/rock/pet scale, geometry dims) do NOT — so the
 *  world grows into a sprawling landscape full of normal-sized things, not a blow-up.
 *  Dial it to re-scale the whole world in one place (set to 1 to restore the original). */
export const WORLD_SCALE = 7;
export const ISLAND_MAX_R = 16 * WORLD_SCALE; // =112 — shared by terrain mesh + anything placed on it
