/** petMood — the companion's current activity as a single emoji.
 *
 *  Pure: maps the live FSM state (mode + gesture, the same fields that drive the
 *  pet's motion) to one creative emoji for the head bubble. Returns null when the
 *  pet is simply resting — the bubble only shows when it's *doing* something.
 *  Work outranks any transient gesture (it's busy at the bench, that's the headline).
 */

import type { Gesture } from "../world/entities/lumenform/LumenformFSM";

type Mode = "rest" | "work";

const GESTURE_EMOJI: Partial<Record<Gesture, string>> = {
  wander: "🚶",
  plant: "🌱",
  celebrate: "🎉",
  gaze: "👀",
  nap: "😴",
  play: "🎲",
};

/** The emoji to float above the pet's head, or null to hide the bubble. */
export function petEmoji(mode: Mode, gesture: Gesture): string | null {
  if (mode === "work") return "🔧"; // busy at the Workbench — the headline state
  return GESTURE_EMOJI[gesture] ?? null; // resting with no gesture → no bubble
}
