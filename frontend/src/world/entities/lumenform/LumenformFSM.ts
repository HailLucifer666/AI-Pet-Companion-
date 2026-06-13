/** LumenformFSM — the companion's behavior, as a pure state machine.
 *
 *  It expresses *intent*, not pixels: a destination Place, a baseline disposition
 *  (rest vs. work), and a transient gesture. The renderer turns that into motion
 *  and pose. Real Synapse events drive work (walk to the Workbench while a tool
 *  runs, return home when done, plant on a formed memory); when nothing is
 *  happening the idle scheduler gives it a small private life. Pure → unit-tested.
 *
 *  Under reduced-motion the FSM still runs (the pet IS where state says), but the
 *  idle scheduler is suppressed — no motion for motion's sake.
 */

import type { Place } from "../../places";

export type Gesture = "none" | "plant" | "celebrate" | "gaze" | "nap" | "play" | "wander";

export interface LumenformState {
  place: Place; // where it wants to be
  mode: "rest" | "work"; // work = busy at the Workbench (event-driven)
  gesture: Gesture;
  gestureUntil: number; // ms epoch; 0 = none
  since: number; // ms epoch when the current activity began
  wanderSeed: number; // varies the wander target
}

export type WorldEvent =
  | { kind: "tool-start" }
  | { kind: "tool-end" }
  | { kind: "done" }
  | { kind: "thinking" }
  | { kind: "memory-formed"; memoryId: number }
  | { kind: "skill-drafted" };

export const INITIAL: LumenformState = {
  place: "home",
  mode: "rest",
  gesture: "none",
  gestureUntil: 0,
  since: 0,
  wanderSeed: 1,
};

const GESTURE_MS: Record<Exclude<Gesture, "none">, number> = {
  plant: 1300,
  celebrate: 2600,
  gaze: 1600,
  nap: 9000,
  play: 2400,
  wander: 5000,
};

function withGesture(state: LumenformState, gesture: Gesture, now: number): LumenformState {
  return {
    ...state,
    gesture,
    gestureUntil: gesture === "none" ? 0 : now + GESTURE_MS[gesture],
  };
}

/** Fold a real Synapse event into the state. */
export function reduceLumenform(
  state: LumenformState,
  event: WorldEvent,
  now: number,
): LumenformState {
  switch (event.kind) {
    case "tool-start":
      return { ...state, place: "workbench", mode: "work", gesture: "none", gestureUntil: 0, since: now };
    case "tool-end":
      // Still at the bench; more tools may follow. Just clear any transient.
      return state.mode === "work" ? state : { ...state, place: "workbench", mode: "work", since: now };
    case "done":
      return { ...state, place: "home", mode: "rest", gesture: "none", gestureUntil: 0, since: now };
    case "memory-formed":
      // Plant where it stands (the crystal itself is spawned by the store).
      return withGesture({ ...state, since: now }, "plant", now);
    case "skill-drafted":
      return withGesture({ ...state, since: now }, "celebrate", now);
    case "thinking":
      // Perk up only when at rest; never interrupt work.
      return state.mode === "rest" && state.gesture === "none"
        ? withGesture(state, "gaze", now)
        : state;
    default:
      return state;
  }
}

/** Advance idle life. Call on a timer. Returns a new state when something changes,
 *  else the same reference. No-op while busy, while a gesture is still playing, or
 *  under reduced-motion. */
export function scheduleIdle(
  state: LumenformState,
  now: number,
  rnd: () => number,
  reduced: boolean,
  night = false,
): LumenformState {
  if (reduced) return state;
  if (state.mode === "work") return state;
  if (state.gesture !== "none" && now < state.gestureUntil) return state;

  // A gesture just expired → settle back before choosing the next thing.
  if (state.gesture !== "none") {
    const settledPlace = state.gesture === "wander" ? "home" : state.place;
    return { ...state, gesture: "none", gestureUntil: 0, place: settledPlace, since: now };
  }

  // Idle long enough → pick a small activity, weighted by how long it's rested.
  const idleMs = now - state.since;
  if (idleMs < 6000) return state;

  const roll = rnd();
  // In the user's quiet hours the companion settles down and naps sooner.
  if (night && idleMs > 15_000 && roll < 0.7) {
    return withGesture({ ...state, since: now }, "nap", now);
  }
  if (idleMs > 60_000 && roll < 0.5) {
    return withGesture({ ...state, since: now }, "nap", now);
  }
  if (roll < 0.34) {
    return withGesture({ ...state, place: "wander", wanderSeed: Math.floor(rnd() * 1e9) || 1, since: now }, "wander", now);
  }
  if (roll < 0.62) {
    return withGesture({ ...state, since: now }, "gaze", now);
  }
  if (roll < 0.8) {
    return withGesture({ ...state, since: now }, "play", now);
  }
  return state; // sometimes just rest
}
