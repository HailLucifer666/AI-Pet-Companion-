/** lure — where the user is calling the companion. A frame-write singleton (like
 *  petPosition) holding the ground point under the cursor plus an expiry; the
 *  CursorLure component writes it on pointer-move, Lumenform3D reads it to decide
 *  where to walk. The pet only answers the call while it's at rest (real work at
 *  the bench always wins) and never under reduced-motion — pure `activeLure` below
 *  encodes exactly that, so it's unit-tested in Node without three/DOM. */

import type { Vec2 } from "./locomotion";

export interface Lure {
  x: number;
  z: number;
  until: number; // ms epoch (performance.now scale); 0 = no active call
}

/** Frame-write singleton, read by Lumenform3D. Outside React/zustand on purpose. */
export const lure: Lure = { x: 0, z: 0, until: 0 };

/** The cursor target to walk toward, or null to defer to the FSM. The pet answers
 *  the lure only when it's resting (work overrides play), motion is allowed, and
 *  the call hasn't decayed. Pure → testable. */
export function activeLure(
  l: Lure,
  nowMs: number,
  mode: "rest" | "work",
  reduced: boolean,
): Vec2 | null {
  if (reduced) return null; // no chase for motion's sake
  if (mode !== "rest") return null; // a real tool-run takes priority
  if (l.until <= nowMs) return null; // the call has decayed
  return { x: l.x, z: l.z };
}
