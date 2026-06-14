/** The Den — a 3D low-poly world (react-three-fiber). The island, the companion,
 *  memory-crystals and clickable Places live in the canvas; activating a Place
 *  opens its surface as an overlay pane over the world (SurfaceOverlay, shared
 *  with the 2D version). The rail still reaches every surface directly. */

import { useState } from "react";
import { World3D } from "../../world3d/World3D";
import { SurfaceOverlay } from "./SurfaceOverlay";

export default function DenView() {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setHost} className="relative h-full w-full overflow-hidden bg-ink-950">
      <World3D />
      <div className="den-atmosphere" aria-hidden />
      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/90">The Grove</p>
        <p className="text-xs text-ink-500/80">drag to move · scroll to zoom · click a place to enter</p>
      </div>
      <SurfaceOverlay container={host} />
    </div>
  );
}
