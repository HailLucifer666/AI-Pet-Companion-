/** quickeningRamp â€” the darkâ†’dawn light schedule for the Quickening (the in-world
 *  first-run hatch). Pure math: maps the ritual's progress to a fractional hour the
 *  day/night palette (daylightAt) accepts, so the world holds deep night while the
 *  questions are asked, warms toward pre-dawn as each is answered, then cubic-eases
 *  into a first dawn at the moment of hatching. No DOM/React/three â†’ unit-tested. */

export type QuickeningPhase = "idle" | "questions" | "hatching" | "dawn";

export const DAWN_MS = 2400; // how long the first-dawn ease takes once hatching begins
const NIGHT = 1.0; // deep-night hour
const PER_Q = 0.8; // each answered question warms the sky this many hours
const PRE_DAWN = 5.0; // the held breath just before dawn
const DAWN = 6.5; // the warm-orange first-dawn hour (daylightAt keyframe)

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The fractional hour for the current ritual phase.
 *  - idle: deep night (1.0)
 *  - questions: 1.0 + qi*0.8 (each answer warms the sky), capped below pre-dawn
 *  - hatching: holds at pre-dawn (5.0) â€” the world holds its breath
 *  - dawn: cubic-eases 5.0 â†’ 6.5 over DAWN_MS (the companion is born) */
export function rampHour(phase: QuickeningPhase, qi: number, elapsedMs: number): number {
  switch (phase) {
    case "questions":
      return Math.min(NIGHT + Math.max(0, qi) * PER_Q, PRE_DAWN - 0.8);
    case "hatching":
      return PRE_DAWN;
    case "dawn": {
      const t = clamp01(elapsedMs / DAWN_MS);
      const eased = 1 - Math.pow(1 - t, 3); // cubic-out: holds low, then opens
      return PRE_DAWN + (DAWN - PRE_DAWN) * eased;
    }
    default:
      return NIGHT;
  }
}
