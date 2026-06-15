/** DenHud Ã¢â‚¬â€ a small glass chip in the Grove's top-right that makes the world's
 *  realness visible: the live local clock (your PC's time, the same signal that
 *  drives day/night) over the real current weather + city the backend resolved by
 *  IP from Open-Meteo. Weather unavailable Ã¢â€ â€™ just the clock (the sky still falls
 *  back to the day/night cycle). Display only Ã¢â‚¬â€ reads existing real data, fakes
 *  nothing. Static text, so reduced-motion needs no special case. */

import { useEffect, useState } from "react";
import type { Weather, WeatherCategory } from "../../lib/api";
import { useWeather } from "../../world3d/useWeather";

const HALF_MIN = 30 * 1000;

const LABELS: Record<WeatherCategory, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  overcast: "Overcast",
  fog: "Fog",
  rain: "Rain",
  snow: "Snow",
  storm: "Storm",
};

/** A glyph per category; `clear`/`cloudy` swap sunÃ¢â€¡â€žmoon by the real is_day flag. */
function glyph(category: WeatherCategory, isDay: boolean): string {
  switch (category) {
    case "clear":
      return isDay ? "Ã¢Ëœâ‚¬Ã¯Â¸Â" : "Ã°Å¸Å’â„¢";
    case "cloudy":
      return isDay ? "Ã¢â€º…" : "Ã¢ËœÂÃ¯Â¸Â";
    case "overcast":
      return "Ã¢ËœÂÃ¯Â¸Â";
    case "fog":
      return "Ã°Å¸Å’Â«Ã¯Â¸Â";
    case "rain":
      return "Ã°Å¸Å’Â§Ã¯Â¸Â";
    case "snow":
      return "Ã°Å¸Å’Â¨Ã¯Â¸Â";
    case "storm":
      return "Ã¢â€ºË†Ã¯Â¸Â";
  }
}

function clock(now: Date): string {
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function WeatherLine({ weather }: { weather: Weather }) {
  if (!weather.available || !weather.category) {
    return <span className="text-ink-500/70">weather offline</span>;
  }
  const parts = [
    `${glyph(weather.category, weather.is_day ?? true)} ${LABELS[weather.category]}`,
    weather.temp_c != null ? `${Math.round(weather.temp_c)}Ã‚Â°` : null,
    weather.city || null,
  ].filter(Boolean);
  return <span>{parts.join(" Ã‚Â· ")}</span>;
}

export function DenHud() {
  const weather = useWeather();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), HALF_MIN);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute right-5 top-4 select-none text-right">
      <p className="glow-soft font-display text-2xl font-semibold leading-none tracking-wide text-ink-100/95 tabular-nums">
        {clock(now)}
      </p>
      <p className="mt-1 text-xs text-ink-300/85">
        <WeatherLine weather={weather} />
      </p>
    </div>
  );
}
