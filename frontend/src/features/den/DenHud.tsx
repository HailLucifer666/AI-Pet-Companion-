/** DenHud — a small glass chip in the Grove's top-right that makes the world's
 *  realness visible: the live local clock (your PC's time, the same signal that
 *  drives day/night) over the real current weather + city the backend resolved by
 *  IP from Open-Meteo. Weather unavailable → just the clock (the sky still falls
 *  back to the day/night cycle). Display only — reads existing real data, fakes
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

/** A glyph per category; `clear`/`cloudy` swap sun⇄moon by the real is_day flag. */
function glyph(category: WeatherCategory, isDay: boolean): string {
  switch (category) {
    case "clear":
      return isDay ? "☀️" : "🌙";
    case "cloudy":
      return isDay ? "⛅" : "☁️";
    case "overcast":
      return "☁️";
    case "fog":
      return "🌫️";
    case "rain":
      return "🌧️";
    case "snow":
      return "🌨️";
    case "storm":
      return "⛈️";
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
    weather.temp_c != null ? `${Math.round(weather.temp_c)}°` : null,
    weather.city || null,
  ].filter(Boolean);
  return <span>{parts.join(" · ")}</span>;
}

import { audioEngine } from "../../lib/audioEngine";

export function DenHud() {
  const weather = useWeather();
  const [now, setNow] = useState(() => new Date());
  // The audio engine reads its own localStorage state on init, so we read it back directly.
  const [muted, setMuted] = useState(audioEngine.getMuted());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), HALF_MIN);
    return () => clearInterval(id);
  }, []);

  const toggleMute = () => {
    const newMuted = !muted;
    audioEngine.setMuted(newMuted);
    setMuted(newMuted);
  };

  return (
    <div className="pointer-events-auto absolute right-5 top-4 flex flex-col items-end gap-1 select-none text-right">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="text-ink-400/80 hover:text-ink-200 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-claw-400 rounded-sm"
          title={muted ? "Unmute Sound" : "Mute Sound"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <p className="glow-soft font-display text-2xl font-semibold leading-none tracking-wide text-ink-100/95 tabular-nums pointer-events-none">
          {clock(now)}
        </p>
      </div>
      <p className="text-xs text-ink-300/85 pointer-events-none">
        <WeatherLine weather={weather} />
      </p>
    </div>
  );
}
