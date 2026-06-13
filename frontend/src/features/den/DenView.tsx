/** The Den — the full-bleed living world. Places in the Grove are clickable DOM
 *  hotspots that open the matching surface as an overlay pane; the rail still
 *  reaches everything directly. Keyboard parity: Tab/WASD move between Places,
 *  Enter/Space open, Esc returns to the Grove (Esc handled by the dialog). */

import { useCallback, useEffect, useState } from "react";
import { WorldCanvas } from "../../world/components/WorldCanvas";
import { PlaceHotspots } from "./PlaceHotspots";
import { SurfaceOverlay } from "./SurfaceOverlay";
import { NAV_PLACES } from "../../world/places";
import { KEY_TO_DIR, pickByDirection } from "../../world/navKeys";
import { useWorldNav } from "../../state/worldNavStore";
import { Kbd } from "../../components/ui";

function focusPlace(host: HTMLElement | null, index: number): void {
  const place = NAV_PLACES[index];
  if (!place) return;
  host?.querySelector<HTMLButtonElement>(`[data-place="${place.id}"]`)?.focus();
}

export default function DenView() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const route = useWorldNav((s) => s.route);
  const openSurface = useWorldNav((s) => s.openSurface);

  // In-canvas activations (clicking a crystal or the pet — W-8) route here too.
  useEffect(() => {
    const onPlace = (e: Event) => {
      const target = (e as CustomEvent<{ route?: string }>).detail?.route;
      if (target) openSurface(target);
    };
    window.addEventListener("world:place-activated", onPlace);
    return () => window.removeEventListener("world:place-activated", onPlace);
  }, [openSurface]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (route) return; // an overlay is open; it owns its keys
      const key = e.key.toLowerCase();
      if (key === "m") {
        focusPlace(host, 0);
        e.preventDefault();
        return;
      }
      const dir = KEY_TO_DIR[key];
      if (!dir) return;
      const curId = (document.activeElement as HTMLElement | null)?.dataset?.place;
      const curIdx = NAV_PLACES.findIndex((p) => p.id === curId);
      focusPlace(host, pickByDirection(NAV_PLACES, curIdx, dir));
      e.preventDefault();
    },
    [route, host],
  );

  return (
    <div
      ref={setHost}
      onKeyDown={onKeyDown}
      className="relative h-full w-full overflow-hidden bg-ink-950"
    >
      <WorldCanvas className="absolute inset-0" />
      <PlaceHotspots hidden={route !== null} />

      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/80">The Grove</p>
        <p className="text-xs text-ink-500/70">where it begins</p>
      </div>

      <div
        className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 select-none text-[11px] text-ink-500/70"
        aria-hidden
      >
        <Kbd>Tab</Kbd>
        <span>/</span>
        <Kbd>WASD</Kbd>
        <span>move</span>
        <span className="mx-1 text-ink-700">·</span>
        <Kbd>Enter</Kbd>
        <span>open</span>
        <span className="mx-1 text-ink-700">·</span>
        <Kbd>Esc</Kbd>
        <span>back</span>
      </div>

      <SurfaceOverlay container={host} />
    </div>
  );
}
