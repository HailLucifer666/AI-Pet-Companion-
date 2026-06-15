// ============================================================
// NeuraClaw — Loading Screen
// Atmospheric boot experience with progress
// ============================================================

import { useEffect, useState } from 'react';
import { DUSK_TOKENS } from '@/world3d/utils/colors';

export function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('Initializing');

  useEffect(() => {
    const phases = [
      { at: 0, label: 'Initializing' },
      { at: 15, label: 'Loading world geometry' },
      { at: 35, label: 'Planting groves' },
      { at: 55, label: 'Lighting lanterns' },
      { at: 70, label: 'Awakening pet' },
      { at: 85, label: 'Tuning atmosphere' },
      { at: 95, label: 'Entering world' },
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += 1.5;
      setProgress(Math.min(current, 100));

      const phase = phases.reverse().find((p) => current >= p.at);
      if (phase) setPhase(phase.label);

      if (current >= 100) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: `linear-gradient(180deg, ${DUSK_TOKENS.skyNight} 0%, ${DUSK_TOKENS.darkBase} 100%)` }}
    >
      {/* Title */}
      <h1
        className="text-4xl font-light tracking-[0.3em] mb-2"
        style={{ color: DUSK_TOKENS.paper }}
      >
        NEURACLAW
      </h1>
      <p
        className="text-sm tracking-[0.5em] mb-12 opacity-60"
        style={{ color: DUSK_TOKENS.cyan }}
      >
        A WORLD AWAITS
      </p>

      {/* Pet icon */}
      <div className="relative w-16 h-16 mb-8">
        <div
          className="absolute inset-0 rounded-lg animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${DUSK_TOKENS.cyan}22, ${DUSK_TOKENS.ember}22)`,
            border: `1px solid ${DUSK_TOKENS.cyan}44`,
          }}
        />
        <div
          className="absolute inset-2 rounded"
          style={{ background: DUSK_TOKENS.darkBase }}
        >
          {/* Simple eye representation */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: DUSK_TOKENS.cyan, boxShadow: `0 0 8px ${DUSK_TOKENS.cyan}` }}
          />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: DUSK_TOKENS.cyan, boxShadow: `0 0 8px ${DUSK_TOKENS.cyan}` }}
          />
        </div>
      </div>

      {/* Phase label */}
      <p className="text-xs tracking-widest mb-4 opacity-50" style={{ color: DUSK_TOKENS.paper }}>
        {phase.toUpperCase()}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-0.5 rounded-full overflow-hidden" style={{ background: `${DUSK_TOKENS.paper}22` }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${DUSK_TOKENS.cyan}, ${DUSK_TOKENS.ember})`,
          }}
        />
      </div>

      {/* Percentage */}
      <p className="text-xs mt-3 opacity-40 tabular-nums" style={{ color: DUSK_TOKENS.paper }}>
        {Math.floor(progress)}%
      </p>

      {/* Subtle glow at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-20"
        style={{
          background: `radial-gradient(ellipse at center bottom, ${DUSK_TOKENS.cyan}44, transparent 70%)`,
        }}
      />
    </div>
  );
}
