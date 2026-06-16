/** Place hotspots — real, focusable DOM buttons positioned over the canvas at the
 *  Places' normalized coords (the accessible alternative to in-canvas hit-testing).
 *  Hover/focus brightens a ring and reveals the label; activating opens the surface
 *  as a diegetic overlay. Hidden + inert while an overlay is already open. */

import { NAV_PLACES } from "../../world/places";
import { useWorldNav } from "../../state/worldNavStore";
import { cx } from "../../components/ui";

export function PlaceHotspots({ hidden }: { hidden: boolean }) {
  const openSurface = useWorldNav((s) => s.openSurface);

  return (
    <div
      className={cx(
        "absolute inset-0 transition-opacity duration-300",
        hidden && "pointer-events-none opacity-0",
      )}
      aria-hidden={hidden}
    >
      {NAV_PLACES.map((p) => (
        <button
          key={p.id}
          data-place={p.id}
          onClick={() => openSurface(p.route)}
          aria-label={`${p.label} — ${p.sub}`}
          tabIndex={hidden ? -1 : 0}
          style={{ left: `${p.nx * 100}%`, top: `${p.ny * 100}%` }}
          className={cx(
            "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2",
            "rounded-full outline-none",
          )}
        >
          {/* Ring: a quiet presence that brightens on hover/focus. */}
          <span
            aria-hidden
            className={cx(
              "size-12 rounded-full border border-claw-500/30 bg-claw-500/5 transition-all duration-200",
              "group-hover:border-claw-400/70 group-hover:bg-claw-500/15 group-hover:shadow-[0_0_24px_-4px_var(--color-claw-500)]",
              "group-focus-visible:border-claw-400 group-focus-visible:bg-claw-500/20 group-focus-visible:ring-2 group-focus-visible:ring-claw-400",
            )}
          />
          <span
            className={cx(
              "pointer-events-none absolute top-14 whitespace-nowrap rounded-ctl px-2 py-1 text-center",
              "surface-overlay opacity-0 transition-opacity duration-200",
              "group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            <span className="block font-display text-xs font-medium text-ink-100">{p.label}</span>
            <span className="block text-[10px] text-ink-500">{p.sub}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
