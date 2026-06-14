/** celestial — where the sun/moon disc sits and how the two crossfade, as pure
 *  math (no three, no GPU). The visible body keeps the day/night light's true
 *  compass AZIMUTH (`sunDir` from daylight.ts) but its elevation is capped low so it
 *  rides near the horizon — otherwise it sits overhead and the down-looking explore
 *  camera never frames it. Placed at a fixed sky distance → shows where the dominant
 *  light comes from (sun's arc by day, moon's by night). Sun fades in / moon fades
 *  out with `dayness`, crossing at twilight. Pure → unit-tested; Sky3D adds the
 *  camera position so the body reads as infinitely far. */

export const SKY_DIST = 200; // camera-relative distance to the celestial body
const MAX_ELEV = 0.28; // radians (~16°) — cap height so the body stays in the forward view, not overhead

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
  const horiz = Math.hypot(x, z) || 1;
  const elev = Math.min(Math.atan2(y, horiz), MAX_ELEV); // keep azimuth, cap how high it rides
  const cosE = Math.cos(elev);
  const offset: [number, number, number] = [
    (x / horiz) * cosE * dist,
    Math.sin(elev) * dist,
    (z / horiz) * cosE * dist,
  ];
  // Crossfade in the deep-twilight band (dayness 0.2 → 0.4): full sun by ~dawn/dusk,
  // full moon only in the genuine dark.
  const sunOpacity = smoothstep(0.2, 0.4, dayness);
  return { offset, sunOpacity, moonOpacity: 1 - sunOpacity };
}
