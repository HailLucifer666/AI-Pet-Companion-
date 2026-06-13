/** The Den — full-bleed living world behind everything else. For W-2 it is the
 *  Grove and a quiet place-name; the Lumenform, HUD and cinematics arrive in
 *  later world milestones. Default export so the route can React.lazy() it,
 *  keeping Pixi out of the main bundle until the Den is first opened. */

import { WorldCanvas } from "../../world/components/WorldCanvas";

export default function DenView() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950">
      <WorldCanvas className="absolute inset-0" />
      <div className="pointer-events-none absolute left-5 top-4 select-none">
        <p className="font-display text-sm font-medium tracking-wide text-ink-300/80">
          The Grove
        </p>
        <p className="text-xs text-ink-500/70">where it begins</p>
      </div>
    </div>
  );
}
