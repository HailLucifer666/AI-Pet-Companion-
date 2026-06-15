/** face â€” the companion robot's data-driven expression. Pure: it maps the live
 *  FSM state (the SAME real-event-driven state that moves the pet) to a screen
 *  expression, so the face reacts to real computation, never faked. No three /
 *  canvas imports â†’ unit-tested. The FaceScreen component renders the result. */

export type Expression = "resting" | "curious" | "working" | "happy" | "playful" | "lowpower";

/** Just the slice of the Lumenform FSM the face cares about (structurally a
 *  subset of LumenformState, so the live `lumen` object passes straight in). */
export interface FaceInput {
  mode: string; // "rest" | "work"
  gesture: string; // "none" | "plant" | "celebrate" | "gaze" | "nap" | "play" | "wander"
}

/** Map the live state to a face. Working (a real tool running) outranks any
 *  gesture; otherwise the gesture decides; otherwise the calm resting face. */
export function expressionFor({ mode, gesture }: FaceInput): Expression {
  if (mode === "work") return "working";
  switch (gesture) {
    case "gaze":
      return "curious";
    case "celebrate":
    case "plant":
      return "happy";
    case "play":
      return "playful";
    case "nap":
      return "lowpower";
    default:
      return "resting";
  }
}
