/** The Den — a 3D low-poly world (react-three-fiber). The island, the companion,
 *  memory-crystals and clickable Places live in the canvas; activating a Place
 *  opens its surface as an overlay pane over the world (SurfaceOverlay, shared
 *  with the 2D version). The rail still reaches every surface directly. */

import { useEffect, useState } from "react";
import { World3D } from "../../world3d/World3D";
import { SurfaceOverlay } from "./SurfaceOverlay";
import { DenHud } from "./DenHud";
import { CoilRing } from "./CoilRing";
import { MindsEye } from "./MindsEye";
import { cameraFocus, GROVE_DIST, SEE_PET_DIST } from "../../world3d/cameraFocus";

/** Flies the camera in for a close-up of the companion (or back out to the Grove).
 *  Just nudges the camera's target distance — the rig eases the pivot onto the pet. */
function SeePetButton() {
  const [close, setClose] = useState(false);
  return (
    <button
      onClick={() => {
        const next = !close;
        cameraFocus.request = next ? SEE_PET_DIST : GROVE_DIST;
        setClose(next);
      }}
      className="pointer-events-auto absolute bottom-8 left-5 select-none rounded-full border border-claw-500/40 bg-ink-950/70 px-3 py-1.5 font-display text-xs font-medium text-ink-200 backdrop-blur-sm transition-colors duration-150 hover:border-claw-400 hover:bg-claw-600/30 focus-visible:outline-2 focus-visible:outline-claw-400"
    >
      {close ? "↩ Back to the Grove" : "🔍 See my pet"}
    </button>
  );
}

export default function DenView() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mindOpen, setMindOpen] = useState(false);

  // Press M to open/close the Mind's Eye (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "Escape") setMindOpen(false);
      else if ((e.key === "m" || e.key === "M") && !typing) setMindOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={setHost} className="relative h-full w-full overflow-hidden bg-ink-950">
      <World3D />
      <div className="den-atmosphere" aria-hidden />
      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/90">The Grove</p>
        {/* pointer-only mechanics — the Places are keyboard-reachable as buttons (PlaceHotspots) */}
        <p aria-hidden="true" className="text-xs text-ink-500/80">drag to orbit · scroll in to meet your pet · click a place to enter</p>
      </div>
      <DenHud />
      <CoilRing />
      <SeePetButton />
      <button
        onClick={() => setMindOpen(true)}
        className="pointer-events-auto absolute bottom-[4.25rem] left-5 select-none rounded-full border border-claw-500/40 bg-ink-950/70 px-3 py-1.5 font-display text-xs font-medium text-ink-200 backdrop-blur-sm transition-colors duration-150 hover:border-claw-400 hover:bg-claw-600/30 focus-visible:outline-2 focus-visible:outline-claw-400"
      >
        🧠 Mind's Eye <span className="text-ink-500">(M)</span>
      </button>
      <MindsEye open={mindOpen} onClose={() => setMindOpen(false)} />
      <SurfaceOverlay container={host} />
    </div>
  );
}
