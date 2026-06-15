// ============================================================
// NeuraClaw — In-World HUD
// Minimal diegetic overlay: time, weather, pet status, FPS
// ============================================================

import { useState } from 'react';
import { useWorldStore } from '@/stores/worldStore';
import { useQualityStore } from '@/stores/qualityStore';
import { DUSK_TOKENS } from '@/world3d/utils/colors';
import { SettingsPanel } from './SettingsPanel';

export function HUD() {
  const [showSettings, setShowSettings] = useState(false);
  const { environment, pet, cycleWeather } = useWorldStore();
  const { metrics } = useQualityStore();

  const timeIcon =
    environment.timeOfDay === 'dawn' ? '🌅' :
    environment.timeOfDay === 'day' ? '☀️' :
    environment.timeOfDay === 'dusk' ? '🌇' :
    '🌙';

  const weatherIcon =
    environment.weather === 'clear' ? '✨' :
    environment.weather === 'cloudy' ? '☁️' :
    environment.weather === 'rain' ? '🌧️' :
    environment.weather === 'storm' ? '⛈️' :
    '🌫️';

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-start justify-between p-4">
          {/* Left: World info */}
          <div className="pointer-events-auto flex items-center gap-3">
            <div
              className="px-3 py-1.5 rounded-lg backdrop-blur-md text-xs tracking-wider"
              style={{
                background: `${DUSK_TOKENS.darkBase}99`,
                border: `1px solid ${DUSK_TOKENS.paper}22`,
                color: DUSK_TOKENS.paper,
              }}
            >
              <span className="mr-2">{timeIcon}</span>
              <span className="capitalize">{environment.timeOfDay}</span>
            </div>
            <button
              onClick={cycleWeather}
              className="px-3 py-1.5 rounded-lg backdrop-blur-md text-xs tracking-wider cursor-pointer transition-all hover:scale-105"
              style={{
                background: `${DUSK_TOKENS.darkBase}99`,
                border: `1px solid ${DUSK_TOKENS.paper}22`,
                color: DUSK_TOKENS.paper,
              }}
            >
              <span className="mr-2">{weatherIcon}</span>
              <span className="capitalize">{environment.weather}</span>
            </button>
          </div>

          {/* Right: Stats + settings */}
          <div className="pointer-events-auto flex items-center gap-3">
            {/* FPS */}
            <div
              className="px-2 py-1 rounded text-xs tabular-nums"
              style={{
                background: `${DUSK_TOKENS.darkBase}99`,
                color: metrics.currentFPS >= 55 ? DUSK_TOKENS.bioGreen :
                  metrics.currentFPS >= 35 ? DUSK_TOKENS.ember :
                  '#FF4444',
              }}
            >
              {metrics.currentFPS} FPS
            </div>

            {/* Pet mood */}
            <div
              className="px-3 py-1.5 rounded-lg backdrop-blur-md text-xs tracking-wider capitalize"
              style={{
                background: `${DUSK_TOKENS.darkBase}99`,
                border: `1px solid ${DUSK_TOKENS.paper}22`,
                color: DUSK_TOKENS.cyan,
              }}
            >
              {pet.emotionalState.mood}
            </div>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-8 h-8 rounded-lg backdrop-blur-md flex items-center justify-center cursor-pointer transition-all hover:scale-105"
              style={{
                background: `${DUSK_TOKENS.darkBase}99`,
                border: `1px solid ${DUSK_TOKENS.paper}22`,
                color: DUSK_TOKENS.paper,
              }}
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none">
        <div className="flex items-end justify-between p-4">
          {/* Pet status */}
          <div
            className="pointer-events-auto px-4 py-3 rounded-xl backdrop-blur-md"
            style={{
              background: `${DUSK_TOKENS.darkBase}BB`,
              border: `1px solid ${DUSK_TOKENS.paper}15`,
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: DUSK_TOKENS.cyan,
                  boxShadow: `0 0 6px ${DUSK_TOKENS.cyan}`,
                }}
              />
              <span className="text-xs tracking-wider" style={{ color: DUSK_TOKENS.paper }}>
                LUMENFORM
              </span>
              <span className="text-xs opacity-50" style={{ color: DUSK_TOKENS.paper }}>
                Lv.{pet.level}
              </span>
            </div>
            {/* Energy bar */}
            <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: `${DUSK_TOKENS.paper}15` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pet.emotionalState.energy * 100}%`,
                  background: `linear-gradient(90deg, ${DUSK_TOKENS.cyan}, ${DUSK_TOKENS.ember})`,
                }}
              />
            </div>
          </div>

          {/* Activity */}
          <div
            className="pointer-events-auto px-3 py-2 rounded-lg backdrop-blur-md text-xs tracking-wider capitalize"
            style={{
              background: `${DUSK_TOKENS.darkBase}99`,
              border: `1px solid ${DUSK_TOKENS.paper}15`,
              color: DUSK_TOKENS.paper,
            }}
          >
            {pet.activity === 'idle' ? 'Resting' :
             pet.activity === 'wandering' ? 'Exploring' :
             pet.activity === 'working' ? 'Working' :
             pet.activity === 'sleeping' ? 'Dreaming' :
             pet.activity === 'celebrating' ? 'Celebrating' :
             'Following'}
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}
