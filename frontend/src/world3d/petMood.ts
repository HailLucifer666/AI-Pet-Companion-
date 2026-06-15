/** petMood â€” the companion's current activity as a single emoji.
 *
 *  Pure: maps the live FSM state (mode + gesture, the same fields that drive the
 *  pet's motion) to one creative emoji for the head bubble. Returns null when the
 *  pet is simply resting â€” the bubble only shows when it's *doing* something.
 *  Work outranks any transient gesture (it's busy at the bench, that's the headline).
 */

import type { Gesture } from "../world/entities/lumenform/LumenformFSM";

type Mode = "rest" | "work";

const GESTURE_EMOJI: Partial<Record<Gesture, string>> = {
  wander: "ðŸš¶",
  plant: "ðŸŒ±",
  celebrate: "ðŸŽ‰",
  gaze: "ðŸ‘€",
  nap: "ðŸ˜´",
  play: "ðŸŽ²",
};

/** The emoji to float above the pet's head, or null to hide the bubble. */
export function petEmoji(mode: Mode, gesture: Gesture): string | null {
  if (mode === "work") return "ðŸ”§"; // busy at the Workbench â€” the headline state
  return GESTURE_EMOJI[gesture] ?? null; // resting with no gesture â†’ no bubble
}
