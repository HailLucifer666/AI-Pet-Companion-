/** worldStore — the one-directional bridge from real events to the world.
 *
 *  It subscribes to the same Synapse SSE stream the rail creature uses, folds
 *  events through the pure LumenformFSM, and keeps a crystal for every kept
 *  memory. On entering the Den it hydrates the whole garden from REST (so the
 *  field reflects everything the companion already remembers, not just what forms
 *  while you watch); the live stream then plants and folds crystals incrementally.
 *  The WorldEngine only ever *reads* this store (store → engine), so the render
 *  layer never feeds state back.
 */

import { create } from "zustand";
import { api, type MemoryType } from "../lib/api";
import { connectSynapse } from "../lib/synapse";
import type { SSEEvent } from "../lib/sse";
import { mulberry32 } from "../world/engine/rng";
import {
  INITIAL,
  reduceLumenform,
  scheduleIdle,
  type LumenformState,
  type WorldEvent,
} from "../world/entities/lumenform/LumenformFSM";
import { makeCrystalSeed, MAX_CRYSTALS, type CrystalSeed } from "../world/entities/crystalSeed";

const reduced =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const idleRnd = mulberry32(0x10fc);

interface WorldStore {
  lumen: LumenformState;
  stage: 1 | 2 | 3 | 4;
  crystals: CrystalSeed[];
  dispatch: (event: WorldEvent) => void;
  addCrystal: (id: number, memoryType: MemoryType) => void;
  removeCrystal: (id: number) => void;
  hydrate: () => Promise<void>;
  setStage: (stage: number) => void;
  tickIdle: () => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  lumen: INITIAL,
  stage: 1,
  crystals: [],

  dispatch: (event) => set((state) => ({ lumen: reduceLumenform(state.lumen, event, Date.now()) })),

  addCrystal: (id, memoryType) =>
    set((state) => {
      if (state.crystals.some((c) => c.id === id)) return state;
      const crystal = makeCrystalSeed(id, memoryType);
      return { crystals: [...state.crystals, crystal].slice(-MAX_CRYSTALS) };
    }),

  removeCrystal: (id) =>
    set((state) => {
      if (!state.crystals.some((c) => c.id === id)) return state;
      return { crystals: state.crystals.filter((c) => c.id !== id) };
    }),

  hydrate: async () => {
    try {
      const { memories } = await api.memory();
      // Newest last so the MAX_CRYSTALS cap keeps the most recent if over the limit.
      const ordered = [...memories].reverse();
      const crystals = ordered
        .map((m) => makeCrystalSeed(m.id, m.type))
        .slice(-MAX_CRYSTALS);
      set({ crystals });
    } catch {
      // Offline / backend down: the live stream still plants crystals as memories form.
    }
  },

  setStage: (stage) =>
    set(() => ({ stage: Math.min(4, Math.max(1, stage)) as 1 | 2 | 3 | 4 })),

  tickIdle: () =>
    set((state) => {
      const now = Date.now();
      const h = new Date(now).getHours();
      const night = h < 6 || h >= 21; // the user's quiet hours
      return { lumen: scheduleIdle(state.lumen, now, idleRnd, reduced, night) };
    }),
}));

function toWorldEvent(ev: SSEEvent): WorldEvent | null {
  switch (ev.type) {
    case "agent.tool.start":
      return { kind: "tool-start" };
    case "agent.tool.end":
      return { kind: "tool-end" };
    case "agent.done":
      return { kind: "done" };
    case "agent.thinking":
      return { kind: "thinking" };
    case "skill.drafted":
      return { kind: "skill-drafted" };
    default:
      return null;
  }
}

let refs = 0;
let disconnect: (() => void) | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;

/** Open the world's view of the live stream. Ref-counted so the Den can mount
 *  and unmount freely. Hydrates the garden once from REST on first open. */
export function connect(): void {
  refs++;
  if (refs > 1) return;
  const store = useWorldStore.getState();
  void store.hydrate();
  disconnect = connectSynapse((ev) => {
    if (ev.type === "pet.stage") {
      store.setStage(Number(ev.stage) || 1);
      return;
    }
    if (ev.type === "memory.formed") {
      store.addCrystal(Number(ev.memory_id) || 0, String(ev.memory_type || "fact") as MemoryType);
      store.dispatch({ kind: "memory-formed", memoryId: Number(ev.memory_id) || 0 });
      return;
    }
    if (ev.type === "memory.forgotten") {
      store.removeCrystal(Number(ev.memory_id) || 0);
      return;
    }
    const event = toWorldEvent(ev);
    if (event) store.dispatch(event);
  });
  idleTimer = setInterval(() => store.tickIdle(), 700);
}

export function disconnectWorld(): void {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  disconnect?.();
  disconnect = null;
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
}
