/** weather — real weather category → render flags, as pure math (no three).
 *
 *  The backend resolves the user's city by IP and returns an Open-Meteo category
 *  (clear/cloudy/overcast/fog/rain/snow/storm). This maps that to what the Grove
 *  should paint: how much cloud, whether it rains/snows, how much to dim the sun,
 *  how tight the fog draws in, and whether lightning flashes. Pure → unit-tested;
 *  Atmosphere / Clouds3D / Rain3D read these flags. */

import type { Weather, WeatherCategory } from "../lib/api";

export interface WeatherFx {
  clouds: number; // 0..1 cloud amount to draw
  rain: "none" | "light" | "heavy";
  snow: boolean;
  fogScale: number; // multiplies fog near/far — <1 draws fog in (murkier)
  dim: number; // 0..1 reduction of sun/sky brightness
  lightning: boolean;
}

const CLEAR: WeatherFx = { clouds: 0.08, rain: "none", snow: false, fogScale: 1, dim: 0, lightning: false };

/** Flags for a category + optional measured cloud cover (0..100). */
export function weatherFx(category: WeatherCategory, cloudCover = 0): WeatherFx {
  const cc = Math.max(0, Math.min(1, cloudCover / 100));
  switch (category) {
    case "clear":
      return { ...CLEAR, clouds: cc * 0.25 };
    case "cloudy":
      return { clouds: Math.max(0.4, cc), rain: "none", snow: false, fogScale: 0.95, dim: 0.12, lightning: false };
    case "overcast":
      return { clouds: Math.max(0.85, cc), rain: "none", snow: false, fogScale: 0.88, dim: 0.32, lightning: false };
    case "fog":
      return { clouds: 0.5, rain: "none", snow: false, fogScale: 0.5, dim: 0.25, lightning: false };
    case "rain":
      return { clouds: 0.85, rain: cc >= 0.8 ? "heavy" : "light", snow: false, fogScale: 0.8, dim: 0.36, lightning: false };
    case "snow":
      return { clouds: 0.8, rain: "none", snow: true, fogScale: 0.8, dim: 0.24, lightning: false };
    case "storm":
      return { clouds: 1, rain: "heavy", snow: false, fogScale: 0.7, dim: 0.46, lightning: true };
    default:
      return CLEAR;
  }
}

/** Resolve a Weather payload (possibly unavailable) to render flags. Unavailable
 *  → clear, so the sky falls back cleanly to the day/night cycle. */
export function fxFor(weather: Weather): WeatherFx {
  if (!weather.available || !weather.category) return CLEAR;
  return weatherFx(weather.category, weather.cloud_cover ?? 0);
}
