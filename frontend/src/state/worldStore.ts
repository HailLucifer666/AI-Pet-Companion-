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
import { api, type MemoryGraphEdge, type MemoryGraphNode, type MemoryType } from "../lib/api";
import { parseSqliteUtc } from "../world3d/compost";
import { connectSynapse } from "../lib/synapse";
import type { SSEEvent } from "../lib/sse";
import { mulberry32 } from "../world/engine/rng";
import { PULSE_DURATION, type PulseOrigin } from "../world3d/pulse";
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

const MAX_PULSES = 14;
let pulseId = 1;
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Memory ids planted *live* (via the stream, not the REST hydration). The crystal
 *  for each flashes once as it sprouts; Crystals3D consumes the id on first frame. */
export const freshCrystals = new Set<number>();

/** memory_id → the epoch ms a memory last *mattered* (last accessed, else created).
 *  Feeds compost: crystals fade + sink the longer they go unaccessed. */
function recencyMap(nodes: MemoryGraphNode[]): Record<number, number | null> {
  const map: Record<number, number | null> = {};
  for (const n of nodes) map[n.id] = parseSqliteUtc(n.last_accessed_at) ?? parseSqliteUtc(n.created_at);
  return map;
}

export interface Pulse {
  id: number;
  origin: PulseOrigin;
  bornMs: number;
}

interface WorldStore {
  lumen: LumenformState;
  stage: 1 | 2 | 3 | 4;
  crystals: CrystalSeed[];
  xpFrac: number; // 0..1 toward the next level — fills the Spore Gate
  level: number;
  pulses: Pulse[];
  bloomAt: number; // performance.now() of the last level-up (the gate blooms)
  threads: MemoryGraphEdge[]; // similarity links between memory crystals (real embeddings)
  recencyById: Record<number, number | null>; // memory_id → last-mattered epoch ms (compost)
  speech: string; // the companion's currently-spoken chat line (streams into PetBubble); "" = silent
  dispatch: (event: WorldEvent) => void;
  addCrystal: (id: number, memoryType: MemoryType) => void;
  removeCrystal: (id: number) => void;
  setXp: (total: number) => void;
  addPulse: (origin: PulseOrigin) => void;
  prunePulses: () => void;
  bloom: () => void;
  setSpeech: (text: string) => void;
  refreshThreads: () => Promise<void>;
  hydrate: () => Promise<void>;
  setStage: (stage: number) => void;
  tickIdle: () => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  lumen: INITIAL,
  stage: 1,
  crystals: [],
  xpFrac: 0,
  level: 0,
  pulses: [],
  bloomAt: 0,
  threads: [],
  recencyById: {},
  speech: "",

  dispatch: (event) => set((state) => ({ lumen: reduceLumenform(state.lumen, event, Date.now()) })),

  addCrystal: (id, memoryType) =>
    set((state) => {
      if (state.crystals.some((c) => c.id === id)) return state;
      freshCrystals.add(id); // planted live → it flashes as it sprouts
      const crystal = makeCrystalSeed(id, memoryType);
      return { crystals: [...state.crystals, crystal].slice(-MAX_CRYSTALS) };
    }),

  removeCrystal: (id) =>
    set((state) => {
      freshCrystals.delete(id); // drop a never-mounted fresh id so the set can't leak
      if (!state.crystals.some((c) => c.id === id)) return state;
      return { crystals: state.crystals.filter((c) => c.id !== id) };
    }),

  setXp: (total) =>
    set(() => ({ level: Math.floor(total / 100), xpFrac: (((total % 100) + 100) % 100) / 100 })),

  addPulse: (origin) =>
    set((state) => {
      const t = nowMs();
      const live = state.pulses.filter((p) => t - p.bornMs < PULSE_DURATION); // drop finished
      return { pulses: [...live, { id: pulseId++, origin, bornMs: t }].slice(-MAX_PULSES) };
    }),

  prunePulses: () =>
    set((state) => {
      if (state.pulses.length === 0) return state;
      const t = nowMs();
      const live = state.pulses.filter((p) => t - p.bornMs < PULSE_DURATION);
      return live.length === state.pulses.length ? state : { pulses: live }; // unmount finished motes
    }),

  bloom: () => set(() => ({ bloomAt: nowMs() })),

  setSpeech: (text) => set(() => ({ speech: text })),

  refreshThreads: async () => {
    try {
      const { nodes, edges } = await api.memoryGraph();
      set({ threads: edges, recencyById: recencyMap(nodes) });
    } catch {
      // keep the last web on a transient failure
    }
  },

  hydrate: async () => {
    try {
      const [{ memories }, petRes, graph] = await Promise.all([
        api.memory(),
        api.pet(),
        api.memoryGraph().catch(() => ({ nodes: [], edges: [] })),
      ]);
      // Newest last so the MAX_CRYSTALS cap keeps the most recent if over the limit.
      const ordered = [...memories].reverse();
      const crystals = ordered
        .map((m) => makeCrystalSeed(m.id, m.type))
        .slice(-MAX_CRYSTALS);
      const total = petRes.pet?.xp ?? 0;
      set({
        crystals,
        level: Math.floor(total / 100),
        xpFrac: (((total % 100) + 100) % 100) / 100,
        threads: graph.edges,
        recencyById: recencyMap(graph.nodes),
      });
    } catch {
      // Offline / backend down: the live stream still plants crystals + ticks XP.
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
    if (ev.type === "xp.awarded") {
      store.setXp(Number(ev.total) || 0);
      return;
    }
    if (ev.type === "pet.levelup") {
      store.setXp(Number(ev.total) || 0);
      store.bloom();
      store.addPulse("garden"); // an inbound mote draws energy into the arch as it blooms
      return;
    }
    if (ev.type === "memory.formed") {
      store.addCrystal(Number(ev.memory_id) || 0, String(ev.memory_type || "fact") as MemoryType);
      store.dispatch({ kind: "memory-formed", memoryId: Number(ev.memory_id) || 0 });
      store.addPulse("garden");
      void store.refreshThreads(); // the web gained a node — re-link it
      return;
    }
    if (ev.type === "memory.forgotten") {
      store.removeCrystal(Number(ev.memory_id) || 0);
      void store.refreshThreads();
      return;
    }
    // A real tool run / skill draft sends a pulse from its origin, then still
    // drives the FSM (toWorldEvent) below.
    if (ev.type === "agent.tool.start") store.addPulse("workbench");
    if (ev.type === "skill.drafted") store.addPulse("hollow");
    const event = toWorldEvent(ev);
    if (event) store.dispatch(event);
  });
  idleTimer = setInterval(() => {
    store.tickIdle();
    store.prunePulses(); // evict finished pulses so their Mote components unmount
  }, 700);
}

export function disconnectWorld(): void {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  disconnect?.();
  disconnect = null;
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = null;
}
