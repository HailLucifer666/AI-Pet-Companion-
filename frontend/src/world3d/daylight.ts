/** daylight â€” the sky/light at a given hour, as pure math (no three, no GPU).
 *
 *  A small set of keyframes (night â†’ dawn â†’ noon â†’ dusk â†’ night) interpolated by
 *  the local clock, so the Grove's sky tracks your real time of day. Returns
 *  colors (THREE hex) + light intensities + a sun direction + a 0..1 "dayness"
 *  the weather layer dims against. Dusk â‰ˆ the world's existing warm look. Pure â†’
 *  unit-tested; the renderer (Atmosphere) lerps toward whatever this returns. */

export interface DaySky {
  sky: number; // background + base fog color
  sun: number; // directional (sun/moon) color
  ambient: number; // ambient fill color
  sunIntensity: number;
  hemiIntensity: number;
  sunDir: [number, number, number];
  dayness: number; // 0 deep night â€¦ 1 full noon
  isNight: boolean;
}

interface Key extends DaySky {
  h: number;
}

// Hours 0..24. "Bright day / full-glow night": noon is genuinely bright (lifted to
// counter ACES tonemapping), night sinks to a deep teal-black cave with a cool cyan
// ambient so the emissive crystals/pet/mushrooms (carried by Bloom) own the dark.
const KEYS: Key[] = [
  { h: 0, sky: 0x060a14, sun: 0x3a5a86, ambient: 0x12303a, sunIntensity: 0.22, hemiIntensity: 0.32, sunDir: [-8, 11, -7], dayness: 0, isNight: true },
  // Hold the cave dark through the small hours (no early-dawn brightening).
  { h: 5, sky: 0x070b18, sun: 0x3a5a86, ambient: 0x123038, sunIntensity: 0.26, hemiIntensity: 0.34, sunDir: [-4, 9, -6], dayness: 0.05, isNight: true },
  { h: 6.5, sky: 0x3a3a63, sun: 0xffb074, ambient: 0x5a566f, sunIntensity: 1.2, hemiIntensity: 0.7, sunDir: [16, 7, 6], dayness: 0.45, isNight: false },
  { h: 12.5, sky: 0x74b0dc, sun: 0xfff4da, ambient: 0xa6bcd2, sunIntensity: 2.2, hemiIntensity: 1.35, sunDir: [10, 27, 8], dayness: 1, isNight: false },
  { h: 18.5, sky: 0x1b2138, sun: 0xffe6b8, ambient: 0x5a6b8c, sunIntensity: 1.5, hemiIntensity: 0.85, sunDir: [18, 18, 10], dayness: 0.45, isNight: false },
  { h: 24, sky: 0x060a14, sun: 0x3a5a86, ambient: 0x12303a, sunIntensity: 0.22, hemiIntensity: 0.32, sunDir: [-8, 11, -7], dayness: 0, isNight: true },
];

/** How much to multiply an emissive object's glow for the time of day: ~1Ã— at noon,
 *  rising toward night so crystals/pet/mushrooms blaze in the dark (the "full-glow
 *  night"). Pure â†’ unit-tested. */
export function glowBoost(dayness: number, boost = 1.25): number {
  const d = Math.max(0, Math.min(1, dayness));
  return 1 + (1 - d) * boost;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}

/** The sky at hour `h` (0..24, fractional ok). */
export function daylightAt(h: number): DaySky {
  const hour = ((h % 24) + 24) % 24;
  let lo = KEYS[0];
  let hi = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hour >= KEYS[i].h && hour <= KEYS[i + 1].h) {
      lo = KEYS[i];
      hi = KEYS[i + 1];
      break;
    }
  }
  const span = hi.h - lo.h || 1;
  const t = (hour - lo.h) / span;
  return {
    sky: lerpHex(lo.sky, hi.sky, t),
    sun: lerpHex(lo.sun, hi.sun, t),
    ambient: lerpHex(lo.ambient, hi.ambient, t),
    sunIntensity: lerp(lo.sunIntensity, hi.sunIntensity, t),
    hemiIntensity: lerp(lo.hemiIntensity, hi.hemiIntensity, t),
    sunDir: [
      lerp(lo.sunDir[0], hi.sunDir[0], t),
      lerp(lo.sunDir[1], hi.sunDir[1], t),
      lerp(lo.sunDir[2], hi.sunDir[2], t),
    ],
    dayness: lerp(lo.dayness, hi.dayness, t),
    isNight: hour < 5.5 || hour >= 20.5,
  };
}

/** Current local hour as a fractional number (0..24). */
export function localHour(now: Date): number {
  return now.getHours() + now.getMinutes() / 60;
}
