/** CoilRing — the companion's growth, read at a glance: a small ember XP ring in
 *  the Den's lower-right whose arc fills with real progress toward the next level
 *  (worldStore.xpFrac) over the level number, with the life-stage beneath. Same
 *  real signal that fills the Spore Gate — never faked. Display only; the global
 *  reduced-motion rule freezes the arc's transition. */

import { useWorldStore } from "../../state/worldStore";

const R = 24;
const C = 2 * Math.PI * R;
const STAGE_NAMES = ["", "Hatchling", "Juvenile", "Adult", "Elder"]; // 1..4 (backend ladder.py canon)

export function CoilRing() {
  const xpFrac = useWorldStore((s) => s.xpFrac);
  const level = useWorldStore((s) => s.level);
  const stage = useWorldStore((s) => s.stage);
  const pct = Math.round(xpFrac * 100);
  const stageName = STAGE_NAMES[stage] ?? "";

  return (
    <div
      className="pointer-events-none absolute bottom-8 right-5 select-none text-center"
      role="img"
      aria-label={`Level ${level}, ${pct}% to the next level. Stage: ${stageName}.`}
    >
      <div className="relative grid place-items-center">
        <svg width="58" height="58" viewBox="0 0 58 58" className="-rotate-90" aria-hidden>
          <circle cx="29" cy="29" r={R} fill="none" stroke="oklch(42% 0.02 60 / 38%)" strokeWidth="5" />
          <circle
            cx="29"
            cy="29"
            r={R}
            fill="none"
            stroke="oklch(73% 0.18 72)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - Math.max(0, Math.min(1, xpFrac)))}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
            style={{ filter: "drop-shadow(0 0 5px oklch(73% 0.18 72 / 55%))" }}
          />
        </svg>
        <div className="absolute grid place-items-center leading-none">
          <span className="glow-soft font-display text-lg font-semibold text-ink-100/95 tabular-nums">{level}</span>
          <span className="mt-0.5 text-[8px] uppercase tracking-[0.15em] text-ink-400">lvl</span>
        </div>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-400/80">
        {stageName} · {pct}%
      </p>
    </div>
  );
}
