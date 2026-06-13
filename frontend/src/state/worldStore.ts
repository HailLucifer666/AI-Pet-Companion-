/** worldStore — the one-directional bridge from real events to the world.
 *
 *  It subscribes to the same Synapse SSE stream the rail creature uses, folds
 *  events through the pure LumenformFSM, seeds a crystal for every formed memory,
 *  and ticks the idle scheduler on a timer. The WorldEngine only ever *reads* this
 *  store (store → engine), so the render layer never feeds state back.
 */

import { create } from "zustand";
import { connectSynapse } from "../lib/synapse";
import type { SSEEvent } from "../lib/sse";
import { mulberry32, range } from "../world/engine/rng";
import {
  INITIAL,
  reduceLumenform,
  scheduleIdle,
  type LumenformState,
  type WorldEvent,
} from "../world/entities/lumenform/LumenformFSM";
import type { CrystalSeed } from "../world/entities/CrystalField";

const reduced =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const idleRnd = mulberry32(0x10fc);

interface WorldStore {
  lumen: LumenformState;
  stage: 1 | 2 | 3 | 4;
  crystals: CrystalSeed[];
  dispatch: (event: WorldEvent) => void;
  setStage: (stage: number) => void;
  tickIdle: () => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  lumen: INITIAL,
  stage: 1,
  crystals: [],

  dispatch: (event) =>
    set((state) => {
      const lumen = reduceLumenform(state.lumen, event, Date.now());
      if (event.kind !== "memory-formed") return { lumen };
      if (state.crystals.some((c) => c.id === event.memoryId)) return { lumen };
      const seed = event.memoryId >>> 0 || Math.floor(Math.random() * 1e9);
      const r = mulberry32(seed);
      const crystal: CrystalSeed = {
        id: event.memoryId,
        seed,
        nx: range(r, 0.18, 0.82),
        ny: range(r, 0.62, 0.86),
      };
      return { lumen, crystals: [...state.crystals, crystal].slice(-48) };
    }),

  setStage: (stage) =>
    set(() => ({ stage: Math.min(4, Math.max(1, stage)) as 1 | 2 | 3 | 4 })),

  tickIdle: () => set((state) => ({ lumen: scheduleIdle(state.lumen, Date.now(), idleRnd, reduced) })),
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
    case "memory.formed":
      return { kind: "memory-formed", memoryId: Number(ev.memory_id) || 0 };
    default:
      return null;
  }
}

let refs = 0;
let disconnect: (() => void) | null = null;
let idleTimer: ReturnType<typeof setInterval> | null = null;

/** Open the world's view of the live stream. Ref-counted so the Den can mount
 *  and unmount freely. */
export function connect(): void {
  refs++;
  if (refs > 1) return;
  const store = useWorldStore.getState();
  disconnect = connectSynapse((ev) => {
    if (ev.type === "pet.stage") {
      store.setStage(Number(ev.stage) || 1);
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
