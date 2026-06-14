/** petAnim — the companion's idle/character animation, as pure math (no three, no
 *  React, no DOM). Locomotion (locomotion.ts) decides WHERE the pet is; this decides
 *  how its body *lives* there: breath, gaze, blink, ear/tail secondary motion, the
 *  walk's leg cycle, a contact shadow. Each function takes primitives and returns
 *  numbers/tuples, so the renderer (Lumenform3D) is a thin humble object over it and
 *  every behaviour is unit-tested in Node. Frequencies are deliberately mismatched
 *  (breath 1.8, glow 2.2, nod 1.8-on-its-own-phase…) so nothing reads as one pulse. */

import type { Gesture } from "../world/entities/lumenform/LumenformFSM";

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Volume-preserving breath for the body core: a y-scale the caller pairs with an
 *  inverse x/z scale. Asymmetric (long exhale plateau) so it reads biological. */
export function breathScale(t: number, gesture: Gesture, working: boolean): number {
  if (gesture === "nap") return 1 + (Math.sin(t * 1.0) * 0.5 + 0.5) * 0.025;
  if (working) return 1 + (Math.sin(t * 2.6) * 0.5 + 0.5) * 0.035;
  return 1 + (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.05;
}

/** Target intensity for the living point light, by state. (The CORE emissive is a
 *  separate value the caller multiplies by glowBoost; the light itself is not.) */
export function glowIntensity(_t: number, gesture: Gesture, working: boolean, moving: boolean): number {
  if (gesture === "nap") return 0.6;
  if (gesture === "celebrate") return 2.0;
  if (working) return 1.8;
  if (moving) return 1.5;
  return 1.3;
}

/** Head bob, additive to the head's base height. Runs on a phase/freq distinct from
 *  the body breath, so head and body read as separate organs (overlapping action). */
export function headNodY(t: number, working: boolean, gesture: Gesture): number {
  if (gesture === "nap") return 0;
  if (gesture === "celebrate") return Math.sin(t * 9) * 0.022;
  if (gesture === "gaze") return Math.sin(t * 2.2) * 0.016;
  if (working) return Math.sin(t * 4.5) * 0.018;
  return Math.sin(t * 1.8) * 0.012;
}

/** Heading-relative yaw for the head to look toward (dx,dz), normalized + clamped so
 *  the neck never twists past ±0.55 rad (it would turn the whole body past that). */
export function gazeYaw(dx: number, dz: number, headingRad: number): number {
  const worldYaw = Math.atan2(dx, dz);
  const rel = worldYaw - headingRad;
  const norm = Math.atan2(Math.sin(rel), Math.cos(rel));
  return clamp(norm, -0.55, 0.55);
}

/** Head pitch toward a target dy over horizontal distance dhoriz. Nap droops the
 *  head; gaze biases the look slightly up (curious). Clamped to a natural range. */
export function gazePitch(dy: number, dhoriz: number, gesture: Gesture): number {
  if (gesture === "nap") return 0.6;
  const raw = Math.atan2(dy, Math.max(0.01, dhoriz));
  const base = gesture === "gaze" ? raw - 0.15 : raw;
  return clamp(base, -0.3, 0.2);
}

/** Tail rotation.x — the body's last part to move; the caller adds a lagged lean. */
export function tailWag(t: number, moving: boolean, gait: number, gesture: Gesture): number {
  if (gesture === "nap") return 0;
  if (gesture === "celebrate") return Math.sin(t * 12) * 0.38;
  if (gesture === "wander") return Math.sin(t * 4) * 0.15;
  if (moving) return Math.sin(t * 3.2 + Math.PI) * 0.08 * gait;
  return Math.sin(t * 1.4) * 0.04;
}

/** Vertical leg lift for leg `i` (0=FL,1=FR,2=BL,3=BR). Diagonal pairs lift together
 *  while moving; a tiny weight-shift keeps legs alive at rest. Additive to base Y. */
export function legLift(t: number, gait: number, moving: boolean, i: number): number {
  if (!moving) return Math.sin(t * 0.8 + i * 0.7) * 0.008;
  const phases = [0, Math.PI, Math.PI, 0];
  return Math.max(0, Math.sin(t * 7 + phases[i])) * 0.08 * gait;
}

/** Eyelid target (0 open … 1 closed): closed only inside the short blink window at
 *  the end of each interval. `blinkPhase` is the accumulated time since last blink. */
export function blinkLidTarget(blinkPhase: number, blinkInterval: number): number {
  const phase = blinkPhase % blinkInterval;
  return phase > blinkInterval - 0.18 ? 1 : 0;
}

/** Next blink interval (s) — Poisson-ish spacing so blinks never feel metronomic. */
export function nextBlinkInterval(rand: () => number): number {
  return 3.8 + rand() * 2.6;
}

/** Ear-flick delta for [left, right] over a 0.15s window — one ear twitches as if it
 *  heard something. `side` picks which ear; outside the window both are 0. */
export function earFlickDelta(t: number, flickStart: number, side: "L" | "R" | "none"): [number, number] {
  const age = t - flickStart;
  if (side === "none" || age < 0 || age > 0.15) return [0, 0];
  const d = Math.sin((age / 0.15) * Math.PI) * 0.3;
  return side === "L" ? [d, 0] : [0, -d];
}

/** Contact-shadow scale — shrinks as the pet hops (yOff), grounding the bounce. */
export function shadowScale(yOff: number, maxYOff = 0.45): number {
  return 0.7 + 0.3 * (1 - Math.min(1, Math.abs(yOff) / maxYOff));
}

/** Work-ring yaw advance for this frame. */
export function workRingDelta(dt: number): number {
  return 1.2 * dt;
}
