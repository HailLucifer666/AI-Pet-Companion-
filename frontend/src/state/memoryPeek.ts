/** memoryPeek — which memory crystal (if any) is open for reading. A click on a
 *  crystal in the Den (Crystals3D, inside the canvas) calls `open(memoryId)`; the
 *  DenView's MemoryPeek panel (DOM, outside the canvas) reads it and shows the REAL
 *  memory text. Mirrors worldNavStore's door pattern so in-canvas clicks reach React
 *  without prop-threading through the Canvas. The id IS the real memory_id. */

import { create } from "zustand";

interface MemoryPeek {
  id: number | null;
  open: (id: number) => void;
  close: () => void;
}

export const useMemoryPeek = create<MemoryPeek>((set) => ({
  id: null,
  open: (id) => set({ id }),
  close: () => set({ id: null }),
}));
