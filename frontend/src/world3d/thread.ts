/** thread — pure geometry for the Living Memory Web's filaments.
 *
 *  A straight line between two crystals cuts through the island (the central
 *  terrain peak rises above a low chord) and grazes the ground near the rim —
 *  the "submerged / leaking" look. Instead we arc each filament: a quadratic
 *  bezier whose control point sits at the horizontal midpoint, lifted in Y above
 *  both endpoints. The lift scales with the horizontal span, so short links bow
 *  gently while long cross-island links arch high over the peak. No three imports
 *  → unit-tested.
 */

export type Vec3 = [number, number, number];

const ARCH_K = 0.5; // arch height per unit of horizontal span
const ARCH_MIN = 1.2; // even the shortest link lifts clear of the grass
const ARCH_MAX = 10; // cap so a cross-island link doesn't shoot into the sky

/** Quadratic-bezier control point for the arc between two thread endpoints. */
export function threadArc(a: Vec3, b: Vec3): Vec3 {
  const horiz = Math.hypot(a[0] - b[0], a[2] - b[2]);
  const arch = Math.max(ARCH_MIN, Math.min(ARCH_MAX, horiz * ARCH_K));
  return [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + arch, (a[2] + b[2]) / 2];
}

/** The arc's apex height (the bezier at t=0.5) — useful to assert it clears a peak. */
export function arcApexY(a: Vec3, b: Vec3): number {
  const mid = threadArc(a, b);
  return 0.25 * a[1] + 0.5 * mid[1] + 0.25 * b[1];
}
