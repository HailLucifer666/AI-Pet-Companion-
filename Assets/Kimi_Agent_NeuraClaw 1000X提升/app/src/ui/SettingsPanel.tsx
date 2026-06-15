// ============================================================
// NeuraClaw — Settings Panel
// Quality tier, audio controls, world settings
// ============================================================

import { useQualityStore } from '@/stores/qualityStore';
import { useWorldStore } from '@/stores/worldStore';
import { audioEngine } from '@/world3d/audio/AudioEngine';
import { DUSK_TOKENS } from '@/world3d/utils/colors';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { quality, setTier, resetToAuto } = useQualityStore();
  const { environment, setTimeOfDay, setWeather, setPaused, isPaused } = useWorldStore();

  const tiers: Array<{ id: typeof quality.tier; label: string; color: string }> = [
    { id: 'high', label: 'High', color: DUSK_TOKENS.bioGreen },
    { id: 'medium', label: 'Medium', color: DUSK_TOKENS.cyan },
    { id: 'low', label: 'Low', color: DUSK_TOKENS.ember },
    { id: 'minimal', label: 'Minimal', color: '#FF4444' },
  ];

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-80 rounded-2xl p-6 space-y-6"
        style={{
          background: `${DUSK_TOKENS.darkBase}EE`,
          border: `1px solid ${DUSK_TOKENS.paper}15`,
          boxShadow: `0 0 40px ${DUSK_TOKENS.darkBase}88`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-medium tracking-[0.2em]"
            style={{ color: DUSK_TOKENS.paper }}
          >
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-xs cursor-pointer transition-all hover:scale-110"
            style={{ color: DUSK_TOKENS.paper, background: `${DUSK_TOKENS.paper}15` }}
          >
            ✕
          </button>
        </div>

        {/* Quality Tier */}
        <div className="space-y-2">
          <label className="text-xs tracking-wider opacity-60" style={{ color: DUSK_TOKENS.paper }}>
            QUALITY
          </label>
          <div className="flex gap-2">
            {tiers.map((t) => (
              <button
                key={t.id}
                onClick={() => setTier(t.id)}
                className="flex-1 py-2 rounded-lg text-xs font-medium tracking-wider cursor-pointer transition-all hover:scale-105"
                style={{
                  background: quality.tier === t.id ? `${t.color}33` : `${DUSK_TOKENS.paper}08`,
                  border: `1px solid ${quality.tier === t.id ? t.color : `${DUSK_TOKENS.paper}15`}`,
                  color: quality.tier === t.id ? t.color : DUSK_TOKENS.paper,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={resetToAuto}
            className="w-full py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:scale-[1.02]"
            style={{
              background: `${DUSK_TOKENS.cyan}11`,
              border: `1px solid ${DUSK_TOKENS.cyan}33`,
              color: DUSK_TOKENS.cyan,
            }}
          >
            AUTO DETECT
          </button>
        </div>

        {/* Audio */}
        <div className="space-y-3">
          <label className="text-xs tracking-wider opacity-60" style={{ color: DUSK_TOKENS.paper }}>
            AUDIO
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => audioEngine.setMuted(false)}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{
                background: `${DUSK_TOKENS.cyan}22`,
                border: `1px solid ${DUSK_TOKENS.cyan}44`,
                color: DUSK_TOKENS.cyan,
              }}
            >
              Enable
            </button>
            <button
              onClick={() => audioEngine.setMuted(true)}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{
                background: `${DUSK_TOKENS.ember}22`,
                border: `1px solid ${DUSK_TOKENS.ember}44`,
                color: DUSK_TOKENS.ember,
              }}
            >
              Mute
            </button>
          </div>
        </div>

        {/* World */}
        <div className="space-y-3">
          <label className="text-xs tracking-wider opacity-60" style={{ color: DUSK_TOKENS.paper }}>
            WORLD
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['dawn', 'day', 'dusk', 'night'] as const).map((time) => (
              <button
                key={time}
                onClick={() => setTimeOfDay(time)}
                className="py-2 rounded-lg text-xs capitalize tracking-wider cursor-pointer transition-all hover:scale-105"
                style={{
                  background: environment.timeOfDay === time
                    ? `${DUSK_TOKENS.cyan}33`
                    : `${DUSK_TOKENS.paper}08`,
                  border: `1px solid ${environment.timeOfDay === time ? DUSK_TOKENS.cyan : `${DUSK_TOKENS.paper}15`}`,
                  color: environment.timeOfDay === time ? DUSK_TOKENS.cyan : DUSK_TOKENS.paper,
                }}
              >
                {time}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['clear', 'cloudy', 'rain'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWeather(w)}
                className="py-1.5 rounded-lg text-xs capitalize cursor-pointer transition-all hover:scale-105"
                style={{
                  background: environment.weather === w
                    ? `${DUSK_TOKENS.ember}33`
                    : `${DUSK_TOKENS.paper}08`,
                  border: `1px solid ${environment.weather === w ? DUSK_TOKENS.ember : `${DUSK_TOKENS.paper}15`}`,
                  color: environment.weather === w ? DUSK_TOKENS.ember : DUSK_TOKENS.paper,
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Pause */}
        <button
          onClick={() => setPaused(!isPaused)}
          className="w-full py-2.5 rounded-xl text-xs tracking-[0.2em] font-medium cursor-pointer transition-all hover:scale-[1.02]"
          style={{
            background: isPaused ? `${DUSK_TOKENS.bioGreen}22` : `${DUSK_TOKENS.paper}08`,
            border: `1px solid ${isPaused ? DUSK_TOKENS.bioGreen : `${DUSK_TOKENS.paper}15`}`,
            color: isPaused ? DUSK_TOKENS.bioGreen : DUSK_TOKENS.paper,
          }}
        >
          {isPaused ? 'RESUME' : 'PAUSE'}
        </button>
      </div>
    </div>
  );
}
