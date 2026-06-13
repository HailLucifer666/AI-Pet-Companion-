/** flow — the drifting light-motes' motion, as pure math (no three, no GPU).
 *  A deterministic field of motes hovering over the island; each drifts on a
 *  slow looping path (a cheap curl-ish wander built from offset sines) so the air
 *  always reads as gently alive. The renderer (Particles3D) just samples
 *  `motePosition(m, t)` each frame and writes it into a Points buffer.
 *  Pure → unit-tested in Node; deterministic so the field never reshuffles. */

import { mulberry32 } from "../../world/engine/rng";

export interface Mote {
  bx: number; // base position the drift orbits around
  by: number;
  bz: number;
  phase: number; // per-mote phase offset so they don't pulse in lockstep
  speed: number; // drift speed multiplier
  amp: number; // horizontal drift radius
  bob: number; // vertical bob amplitude
}

export interface MoteField {
  motes: Mote[];
  count: number;
}

/** Build a deterministic field of `count` motes spread over a disc of `radius`,
 *  floating between `yMin` and `yMax`. Same seed → identical field every launch. */
export function makeField(count: number, seed: number, radius = 13, yMin = 0.6, yMax = 6): MoteField {
  const r = mulberry32(seed >>> 0 || 1);
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * radius; // sqrt → even areal spread, not centre-clustered
    motes.push({
      bx: Math.cos(ang) * rad,
      bz: Math.sin(ang) * rad,
      by: yMin + r() * (yMax - yMin),
      phase: r() * Math.PI * 2,
      speed: 0.25 + r() * 0.5,
      amp: 0.3 + r() * 0.7,
      bob: 0.2 + r() * 0.5,
    });
  }
  return { motes, count };
}

/** A mote's world position at time `t` (seconds). Deterministic, allocation-free
 *  into `out`. The drift is two offset sines per axis → a smooth, non-repeating
 *  looking loop that never leaves `amp`/`bob` of the base. */
export function motePosition(m: Mote, t: number, out: { x: number; y: number; z: number }): void {
  const p = t * m.speed + m.phase;
  out.x = m.bx + Math.sin(p) * m.amp + Math.sin(p * 0.37) * m.amp * 0.4;
  out.z = m.bz + Math.cos(p * 0.8) * m.amp + Math.cos(p * 0.23) * m.amp * 0.4;
  out.y = m.by + Math.sin(p * 0.6) * m.bob;
}
