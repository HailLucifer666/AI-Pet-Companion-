/** PetBubble — a small emoji chip that floats above the companion's head saying
 *  what it's doing right now (🔧 working, 😴 napping, 🌱 planting a memory…). It
 *  reads the same live FSM that drives the pet's motion (worldStore.lumen) and maps
 *  it through the pure petEmoji(). When the pet is simply resting the bubble hides.
 *
 *  Mounted as a child of the Lumenform's <group>, so drei's <Html> projects it to
 *  screen space above the pet every frame — no manual camera math. Reduced-motion
 *  just shows the chip, no animation. */

import { Html } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { useWorldStore } from "../state/worldStore";
import { cx } from "../components/ui";
import { petEmoji } from "./petMood";

export function PetBubble() {
  const reduced = useReducedMotion() ?? false;
  const lumen = useWorldStore((s) => s.lumen);
  const speech = useWorldStore((s) => s.speech);
  const emoji = petEmoji(lumen.mode, lumen.gesture);

  // The companion is speaking a chat reply → show the words over its head; this
  // takes priority over the activity emoji.
  if (speech) {
    return (
      <Html position={[0, 1.7, 0]} center distanceFactor={6} zIndexRange={[40, 0]}>
        <div
          className={cx(
            "pointer-events-none max-w-[15rem] select-none rounded-2xl border border-claw-500/40 bg-ink-950/85 px-3 py-1.5 text-center text-[13px] leading-snug text-ink-100 shadow-lg shadow-ink-950/50 backdrop-blur-md",
            !reduced && "animate-[pop-in_180ms_ease-out]",
          )}
        >
          {speech}
        </div>
      </Html>
    );
  }

  if (!emoji) return null; // resting → no bubble

  return (
    <Html position={[0, 1.15, 0]} center distanceFactor={9} zIndexRange={[40, 0]}>
      <div
        key={emoji}
        aria-hidden
        className={cx(
          "pointer-events-none select-none rounded-full border border-claw-500/40 bg-ink-950/75 px-2 py-1 text-base leading-none shadow-lg shadow-ink-950/40 backdrop-blur-sm",
          !reduced && "animate-[pop-in_180ms_ease-out]",
        )}
      >
        {emoji}
      </div>
    </Html>
  );
}
