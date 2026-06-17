import { create } from "zustand";

interface SightStore {
  capturedImage: string | null;
  setCapturedImage: (image: string | null) => void;
  clearCapturedImage: () => void;
}

export const useSightStore = create<SightStore>((set) => ({
  capturedImage: null,
  setCapturedImage: (image) => set({ capturedImage: image }),
  clearCapturedImage: () => set({ capturedImage: null }),
}));
