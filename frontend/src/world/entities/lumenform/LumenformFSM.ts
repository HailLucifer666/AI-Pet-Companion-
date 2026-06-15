/** LumenformFSM â€” the companion's behavior, as a pure state machine.
 *
 *  It expresses *intent*, not pixels: a destination Place, a baseline disposition
 *  (rest vs. work), and a transient gesture. The renderer turns that into motion
 *  and pose. Real Synapse events drive work (walk to the Workbench while a tool
 *  runs, return home when done, plant on a formed memory); when nothing is
 *  happening the idle scheduler gives it a small private life. Pure â†’ unit-tested.
 *
 *  Under reduced-motion the FSM still runs (the pet IS where state says), but the
 *  idle scheduler is suppressed â€” no motion for motion's sake.
 */

import type { Place } from "../../../world3d/placeRegistry";

export type Gesture = "none" | "plant" | "celebrate" | "gaze" | "nap" | "play" | "wander";

export interface LumenformState {
  place: Place; // where it wants to be
  mode: "rest" | "work"; // work = busy at the Workbench (event-driven)
  gesture: Gesture;
  gestureUntil: number; // ms epoch; 0 = none
  since: number; // ms epoch when the current activity began
  wanderSeed: number; // varies the wander target
  lastGesture: Gesture; // anti-repeat
  energy: number; // 0.0 to 1.0 (drains from work, recharges from rest/memories)
  mood: number; // -1.0 to 1.0 (valence)
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
  lastGesture: "none",
  energy: 1.0,
  mood: 0.0,
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
    lastGesture: gesture === "none" ? state.lastGesture : gesture,
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
      // Work drains energy
      return { ...state, place: "workbench", mode: "work", gesture: "none", gestureUntil: 0, since: now, energy: Math.max(0, state.energy - 0.1) };
    case "tool-end":
      // Still at the bench; more tools may follow. Just clear any transient.
      return state.mode === "work" ? state : { ...state, place: "workbench", mode: "work", since: now };
    case "done":
      return { ...state, place: "home", mode: "rest", gesture: "none", gestureUntil: 0, since: now };
    case "memory-formed":
      // Walk the road to the Memory Garden (greenhouse) and plant there
      return withGesture({ ...state, place: "garden", since: now, mood: Math.min(1.0, state.mood + 0.2), energy: Math.min(1.0, state.energy + 0.1) }, "plant", now);
    case "skill-drafted":
      // Walk to the Foundry (forge/Workbench) and celebrate the newly forged skill.
      return withGesture({ ...state, place: "workbench", since: now, mood: Math.min(1.0, state.mood + 0.3), energy: 1.0 }, "celebrate", now);
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
  weatherCategory: string = "clear",
): LumenformState {
  if (reduced) return state;
  if (state.mode === "work") return state;
  if (state.gesture !== "none" && now < state.gestureUntil) return state;

  // A gesture just expired â†’ settle back before choosing the next thing.
  if (state.gesture !== "none") {
    const settledPlace = state.gesture === "wander" ? "home" : state.place;
    return { ...state, gesture: "none", gestureUntil: 0, place: settledPlace, since: now };
  }

  // Idle long enough â†’ pick a small activity, weighted by how long it's rested.
  const idleMs = now - state.since;
  if (idleMs < 6000) return state;

  // Slowly restore energy if resting
  let energy = state.energy;
  if (state.mode === "rest" && state.gesture === "none") {
      energy = Math.min(1.0, energy + 0.005);
  }

  const roll = rnd();
  let nextGesture: Gesture = "none";
  
  const isStormy = weatherCategory === "storm" || weatherCategory === "rain";
  const isFoggy = weatherCategory === "fog";

  if (night && idleMs > 15_000 && roll < 0.7) {
    nextGesture = "nap";
  } else if (isStormy && idleMs > 10_000 && roll < 0.8) {
    nextGesture = "nap"; // take shelter
  } else if (energy < 0.3 && roll < 0.6) {
    nextGesture = "nap"; // tired
  } else if (idleMs > 60_000 && roll < 0.5) {
    nextGesture = "nap";
  } else if (roll < 0.34 && !isStormy && !isFoggy) {
    nextGesture = "wander";
  } else if (isFoggy && roll < 0.15) {
    nextGesture = "wander"; // slower wander in fog
  } else if (roll < 0.62) {
    nextGesture = "gaze";
  } else if (roll < 0.8 && energy > 0.6 && state.mood > -0.2) {
    nextGesture = "play"; // happy and energetic
  }

  if (nextGesture !== "none" && nextGesture === state.lastGesture) {
    return { ...state, energy }; // anti-repeat: skip and try again later, but update energy
  }

  if (nextGesture === "wander") {
    return withGesture({ ...state, place: "wander", wanderSeed: Math.floor(rnd() * 1e9) || 1, since: now, energy }, "wander", now);
  } else if (nextGesture !== "none") {
    return withGesture({ ...state, since: now, energy }, nextGesture, now);
  }
  
  if (energy !== state.energy) {
     return { ...state, energy };
  }
  return state; // sometimes just rest
}
