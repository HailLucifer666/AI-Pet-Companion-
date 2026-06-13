/** The Den — now a 3D low-poly world (react-three-fiber). Slice 1 is the Island
 *  itself; the companion, memory-crystals and diegetic 3D navigation arrive in the
 *  next slices. The rail still reaches every surface directly. */

import { World3D } from "../../world3d/World3D";

export default function DenView() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      <World3D />
      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/90">The Grove</p>
        <p className="text-xs text-ink-500/80">drag to look around</p>
      </div>
    </div>
  );
}
