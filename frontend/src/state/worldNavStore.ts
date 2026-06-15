/** worldNavStore â€” which surface (if any) is open as a diegetic overlay over the
 *  Den. The single entry point for "activate a Place": DOM hotspots call it now;
 *  in-canvas clicks (crystals, the pet â€” W-8) will dispatch through the same door
 *  via the `world:place-activated` CustomEvent the Den listens for. */

import { create } from "zustand";

interface WorldNav {
  route: string | null;
  openSurface: (route: string) => void;
  close: () => void;
}

export const useWorldNav = create<WorldNav>((set) => ({
  route: null,
  openSurface: (route) => set({ route }),
  close: () => set({ route: null }),
}));
