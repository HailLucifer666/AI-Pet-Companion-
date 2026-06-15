/** The Den — a 3D low-poly world (react-three-fiber). The island, the companion,
 *  memory-crystals and clickable Places live in the canvas; activating a Place
 *  opens its surface as an overlay pane over the world (SurfaceOverlay, shared
 *  with the 2D version). The rail still reaches every surface directly. */

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { World3D } from "../../world3d/World3D";
import { bloomFlash } from "../../world3d/bloomCinematic";
import { SurfaceOverlay } from "./SurfaceOverlay";
import { DenHud } from "./DenHud";
import { CoilRing } from "./CoilRing";
import { MindsEye } from "./MindsEye";
import { MemoryPeek } from "./MemoryPeek";
import { DenGreeting } from "./DenGreeting";
import { PetChat } from "./PetChat";
import { cameraFocus, GROVE_DIST, SEE_PET_DIST } from "../../world3d/cameraFocus";
import { lure, lureControl } from "../../world3d/lure";
import { hasWebGL } from "../../world3d/quality";
import { useWorldStore } from "../../state/worldStore";

const PILL =
  "pointer-events-auto absolute left-5 select-none rounded-full border border-claw-500/40 bg-ink-950/70 px-3 py-1.5 font-display text-xs font-medium text-ink-200 backdrop-blur-sm transition-colors duration-150 hover:border-claw-400 hover:bg-claw-600/30 focus-visible:outline-2 focus-visible:outline-claw-400";

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
      className={`${PILL} bottom-8`}
    >
      {close ? "↩ Back to the Grove" : "🔍 See my pet"}
    </button>
  );
}

const STAGE_NAMES = ["", "Hatchling", "Juvenile", "Adult", "Elder"]; // 1..4 (backend ladder.py canon)
const WIDEN_MS = 1400;

/** The Widening moment: a brief warm veil sweeps the screen when the companion
 *  reaches a new life stage (real pet.stage). The world's survey range + horizon
 *  fog have just opened (World3D/Atmosphere). Cubic-out fade via bloomFlash;
 *  reduced-motion shows no flash (the wider world is still there, just no sweep). */
function WideningFlash() {
  const reduced = useReducedMotion() ?? false;
  const wideningAt = useWorldStore((s) => s.wideningAt);
  const [op, setOp] = useState(0);

  useEffect(() => {
    if (!wideningAt || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const f = bloomFlash(performance.now() - start, WIDEN_MS);
      setOp(f * 0.5);
      if (f > 0.001) raf = requestAnimationFrame(tick);
      else setOp(0);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [wideningAt, reduced]);

  if (op <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-40"
      style={{
        opacity: op,
        background:
          "radial-gradient(circle at 50% 45%, var(--color-claw-200), var(--color-claw-500) 38%, transparent 72%)",
      }}
    />
  );
}

/** Shown when WebGL can't start (no/blocked GPU). The 3D Grove can't render, but
 *  the companion is still alive — so we state its REAL stage/level/progress and
 *  point to the parts that still work (the chat, the rail). Static — no animation. */
function WorldFallback() {
  const level = useWorldStore((s) => s.level);
  const stage = useWorldStore((s) => s.stage);
  const xpFrac = useWorldStore((s) => s.xpFrac);
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-gradient-to-b from-ink-900 to-ink-950"
      role="img"
      aria-label="The 3D Grove needs WebGL, which isn't available here. Your companion is still alive — chat with it below or use the rail."
    >
      <div className="max-w-sm rounded-2xl border border-claw-500/30 bg-ink-950/70 p-6 text-center backdrop-blur-sm">
        <div className="text-4xl" aria-hidden>🌱</div>
        <p className="mt-3 font-display text-sm font-medium text-ink-100">Your companion rests in the Grove</p>
        <p className="mt-1 text-xs text-ink-400">
          {STAGE_NAMES[stage] ?? "Companion"} · Level {level} · {Math.round(xpFrac * 100)}% to next
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
          The 3D world needs WebGL, which this browser or GPU couldn't start. Everything else still
          works — talk to your companion below, or use the rail to reach Chat, Memory and Notes.
        </p>
      </div>
    </div>
  );
}

/** Toggles whether the companion follows your cursor. Off = free-roam: it ignores
 *  the mouse and lives its own FSM life (roam / work / nap). */
function FreeRoamButton() {
  const [following, setFollowing] = useState(lureControl.enabled);
  return (
    <button
      onClick={() => {
        const next = !following;
        lureControl.enabled = next;
        if (!next) lure.until = 0; // drop any lingering call immediately
        setFollowing(next);
      }}
      className={`${PILL} bottom-[7.5rem]`}
    >
      {following ? "🐾 Following you" : "🍃 Roaming free"}
    </button>
  );
}

export default function DenView() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mindOpen, setMindOpen] = useState(false);
  const webgl = useMemo(hasWebGL, []); // no GPU/WebGL → a static 2D fallback, not a blank canvas

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
      {webgl ? <World3D /> : <WorldFallback />}
      <div className="den-atmosphere" aria-hidden />
      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/90">The Grove</p>
        {/* pointer-only mechanics — the Places are keyboard-reachable as buttons (PlaceHotspots) */}
        {webgl && (
          <p aria-hidden="true" className="text-xs text-ink-500/80">drag to orbit · scroll in to meet your pet · click a place to enter</p>
        )}
      </div>
      <DenHud />
      <PetChat />
      <CoilRing />
      {webgl && <SeePetButton />}
      {webgl && <FreeRoamButton />}
      <button
        onClick={() => setMindOpen(true)}
        className="pointer-events-auto absolute bottom-[4.25rem] left-5 select-none rounded-full border border-claw-500/40 bg-ink-950/70 px-3 py-1.5 font-display text-xs font-medium text-ink-200 backdrop-blur-sm transition-colors duration-150 hover:border-claw-400 hover:bg-claw-600/30 focus-visible:outline-2 focus-visible:outline-claw-400"
      >
        🧠 Mind's Eye <span className="text-ink-500">(M)</span>
      </button>
      <MindsEye open={mindOpen} onClose={() => setMindOpen(false)} />
      {webgl && <MemoryPeek />}
      {webgl && <DenGreeting />}
      <WideningFlash />
      <SurfaceOverlay container={host} />
    </div>
  );
}
