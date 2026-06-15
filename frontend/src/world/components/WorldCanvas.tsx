/** WorldCanvas â€” the React seam to the imperative WorldEngine. Owns exactly one
 *  engine for the lifetime of the mounted host div; StrictMode's double-mount is
 *  handled inside the engine (destroyed-flag + cleanup-first), so this stays tiny.
 *  role="img" + label gives the canvas an accessible name for screen readers. */

import { useEffect, useRef } from "react";
import { WorldEngine } from "../engine/WorldEngine";

export function WorldCanvas({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new WorldEngine(host);
    void engine.start();
    return () => engine.destroy();
  }, []);

  return (
    <div
      ref={hostRef}
      className={className}
      role="img"
      aria-label="The Grove â€” a living world that grows alongside your companion"
    />
  );
}
