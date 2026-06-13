import { create } from "zustand";
import { connectSynapse } from "../lib/synapse";
import type { SSEEvent } from "../lib/sse";

export type CreatureState =
  | "sleeping"
  | "idle"
  | "curious" // reserved
  | "thinking"
  | "working"
  | "learning"
  | "celebrating";

export interface CreatureReaction {
  kind: "ear-flick" | "hop-sparkle";
  seq: number;
}

export interface CreatureStoreState {
  stage: 1 | 2 | 3 | 4;
  xp: number;
  state: CreatureState;
  reaction: CreatureReaction | null;
  lastEventAt: number;
}

const PRIORITY: Record<CreatureState, number> = {
  sleeping: 0,
  idle: 1,
  curious: 2,
  thinking: 3,
  working: 4,
  learning: 5,
  celebrating: 6,
};

const ACTIVITY_VARS: Record<CreatureState, string> = {
  sleeping: "0",
  idle: "0",
  curious: "0.2",
  thinking: "0.4",
  working: "1",
  learning: "0.6",
  celebrating: "0.8",
};

export function reduceCreature(state: CreatureStoreState, event: SSEEvent): Partial<CreatureStoreState> {
  const now = Date.now();
  let nextState = state.state;
  let nextReaction = state.reaction;

  switch (event.type) {
    case "agent.thinking":
      if (PRIORITY["thinking"] >= PRIORITY[state.state] || state.state === "learning" || state.state === "celebrating" || state.state === "sleeping" || state.state === "idle") {
        nextState = "thinking";
      }
      break;
    case "agent.tool.start":
      nextState = "working";
      break;
    case "agent.tool.end":
      nextState = "thinking";
      break;
    case "agent.done":
      nextState = "idle";
      break;
    case "memory.formed":
      nextState = "learning";
      nextReaction = { kind: "ear-flick", seq: (state.reaction?.seq || 0) + 1 };
      break;
    case "skill.drafted":
      nextState = "celebrating";
      nextReaction = { kind: "hop-sparkle", seq: (state.reaction?.seq || 0) + 1 };
      break;
    case "memory.forgotten":
      // no-op
      break;
  }

  return {
    state: nextState,
    reaction: nextReaction,
    lastEventAt: now,
  };
}

interface CreatureStore extends CreatureStoreState {
  dispatch: (event: SSEEvent) => void;
  decayTransient: (expectedState: CreatureState) => void;
  sleepIfIdle: () => void;
}

export const useCreatureStore = create<CreatureStore>((set, get) => ({
  stage: 1,
  xp: 0,
  state: "sleeping",
  reaction: null,
  lastEventAt: Date.now(),

  dispatch: (event) => {
    set((state) => {
      const updates = reduceCreature(state, event);
      if (updates.state && updates.state !== state.state) {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--activity", ACTIVITY_VARS[updates.state]);
        }

        // Handle transient decays
        if (updates.state === "learning") {
          setTimeout(() => get().decayTransient("learning"), 4000);
        } else if (updates.state === "celebrating") {
          setTimeout(() => get().decayTransient("celebrating"), 6000);
        }
      }
      return updates;
    });

    // Reset sleep timer
    setTimeout(() => get().sleepIfIdle(), 30 * 60 * 1000);
  },

  decayTransient: (expectedState) => {
    set((state) => {
      if (state.state === expectedState) {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--activity", ACTIVITY_VARS["idle"]);
        }
        return { state: "idle" };
      }
      return {};
    });
  },

  sleepIfIdle: () => {
    set((state) => {
      if (Date.now() - state.lastEventAt >= 30 * 60 * 1000 - 100 && state.state === "idle") {
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--activity", ACTIVITY_VARS["sleeping"]);
        }
        return { state: "sleeping" };
      }
      return {};
    });
  },
}));

let connectionRefs = 0;
let disconnect: (() => void) | null = null;

export function connect() {
  connectionRefs++;
  if (connectionRefs === 1) {
    disconnect = connectSynapse((event) => {
      useCreatureStore.getState().dispatch(event);
    });
  }
}

export function disconnectSynapse() {
  connectionRefs--;
  if (connectionRefs === 0 && disconnect) {
    disconnect();
    disconnect = null;
  }
}
