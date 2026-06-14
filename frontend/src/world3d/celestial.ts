/** celestial — where the sun/moon disc sits and how the two crossfade, as pure
 *  math (no three, no GPU). The visible body is placed along the day/night light
 *  direction (`sunDir` from daylight.ts) at a fixed sky distance — so it shows
 *  where the dominant light comes from: the sun's arc by day, the moon's by night.
 *  Sun fades in / moon fades out with `dayness`, crossing over at twilight. Pure →
 *  unit-tested; Sky3D adds the camera position so the body reads as infinitely far. */

export const SKY_DIST = 200; // camera-relative distance to the celestial body

export interface Celestial {
  /** Offset from the camera to the body (direction × SKY_DIST). */
  offset: [number, number, number];
  sunOpacity: number; // 1 by day, 0 at night
  moonOpacity: number; // the inverse — they crossfade at twilight
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Body offset + sun/moon opacities for a given light direction and dayness. */
export function celestialPlacement(
  sunDir: [number, number, number],
  dayness: number,
  dist = SKY_DIST,
): Celestial {
  const [x, y, z] = sunDir;
  const len = Math.hypot(x, y, z) || 1;
  const offset: [number, number, number] = [(x / len) * dist, (y / len) * dist, (z / len) * dist];
  // Crossfade in the deep-twilight band (dayness 0.2 → 0.4): full sun by ~dawn/dusk,
  // full moon only in the genuine dark.
  const sunOpacity = smoothstep(0.2, 0.4, dayness);
  return { offset, sunOpacity, moonOpacity: 1 - sunOpacity };
}
