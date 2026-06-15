/** bloomCinematic â€” pure math for the Spore Gate's level-up flash (no three, no
 *  React â†’ unit-testable in Node). A cubic-out decay: the flash pops to full the
 *  instant a real `pet.levelup` lands, then falls off sharply and trails to nothing
 *  over the duration â€” reads as a pop, not a flat fade. */

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Flash brightness 1 â†’ 0 over `durationMs`, cubic-out. A negative `sinceMs`
 *  (clock skew / a stale stamp) clamps to peak â€” a spurious flash is the safer
 *  failure than a spurious dark gate; past the duration â†’ 0. */
export function bloomFlash(sinceMs: number, durationMs: number): number {
  const t = clamp01(sinceMs / durationMs);
  return Math.pow(1 - t, 3);
}

/** The gate's swell from a flash: 1 (at rest) â†’ 1.12 (full bloom). */
export function bloomGateScale(flash: number): number {
  return 1 + clamp01(flash) * 0.12;
}
