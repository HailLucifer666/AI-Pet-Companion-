/** pulse — the path a Mycelium pulse travels, as pure math (no three). A real
 *  Synapse event (a tool run, a memory forming, a skill drafted) sends a mote from
 *  its origin on the island, *through the companion*, into the Spore Gate — so you
 *  can watch real computation flow to where the pet's growth accrues. Two eased
 *  legs (origin→pet, pet→gate), each with a gentle arc lift. Pure → unit-tested. */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type PulseOrigin = "workbench" | "garden" | "hollow";

import { WORLD_SCALE } from "./terrain";

export const PULSE_DURATION = 2200; // ms, origin → gate

/** The gate's glowing centre — pulses terminate here (shared with SporeGate3D). The
 *  arch sits proportionally back on the bigger island (z × WORLD_SCALE); its height
 *  (y) is an object-space offset above the terrain, so it stays the same size. */
export const GATE_POINT: Vec3 = { x: 0, y: 3.2, z: -7 * WORLD_SCALE };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0..1 progress of a pulse born at `bornMs`, read at `nowMs`. Clamped. */
export function pulseT(bornMs: number, nowMs: number): number {
  return clamp01((nowMs - bornMs) / PULSE_DURATION);
}

/** Has the pulse reached the gate? */
export function pulseDone(t: number): boolean {
  return t >= 1;
}

/** Position along the path at progress `t`: first leg origin→pet, second pet→gate,
 *  each smoothstep-eased with a small arc lift at the leg's midpoint. Endpoints
 *  (t=0 origin, t=0.5 pet, t=1 gate) carry no lift. */
export function pulsePoint(t: number, origin: Vec3, pet: Vec3, gate: Vec3 = GATE_POINT): Vec3 {
  const firstLeg = t < 0.5;
  const a = firstLeg ? origin : pet;
  const b = firstLeg ? pet : gate;
  const local = firstLeg ? t * 2 : (t - 0.5) * 2; // 0..1 within the leg
  const e = local * local * (3 - 2 * local); // smoothstep
  const arc = Math.sin(local * Math.PI) * 0.6; // mid-leg lift
  return {
    x: lerp(a.x, b.x, e),
    y: lerp(a.y, b.y, e) + arc,
    z: lerp(a.z, b.z, e),
  };
}
