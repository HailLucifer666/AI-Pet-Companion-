/** SurfaceOverlay â€” a surface opened as a pane over the dimmed, blurred world.
 *
 *  Radix Dialog gives focus-trap, Esc-to-close, return-focus and aria-modal for
 *  free (WCAG). The productivity surfaces render directly under the app's single
 *  router (react-router forbids nesting a second Router). Chat runs in `embedded`
 *  mode so its session navigation stays in local state instead of yanking the URL
 *  away from the Den; Memory and Notes don't route at all. The rail remains the
 *  direct fast path; this is the scenic one.
 */

import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { NAV_PLACES } from "../../world3d/placeRegistry";
import { useWorldNav } from "../../state/worldNavStore";
import { ChatView } from "../chat/ChatView";
import { MemoryView } from "../memory/MemoryView";
import { NotesView } from "../notes/NotesView";

function Surface({ route }: { route: string }) {
  switch (route) {
    case "/chat":
      return <ChatView embedded />;
    case "/memory":
      return <MemoryView />;
    case "/notes":
      return <NotesView />;
    default:
      return null;
  }
}

export function SurfaceOverlay({ container }: { container: HTMLElement | null }) {
  const route = useWorldNav((s) => s.route);
  const close = useWorldNav((s) => s.close);
  const place = NAV_PLACES.find((p) => p.route === route);

  return (
    <RDialog.Root open={route !== null} onOpenChange={(open) => !open && close()}>
      <RDialog.Portal container={container ?? undefined}>
        <RDialog.Overlay className="absolute inset-0 z-40 bg-ink-950/55 backdrop-blur-md data-[state=open]:animate-fade-in" />
        <RDialog.Content
          aria-describedby={undefined}
          className="surface-overlay absolute inset-3 z-50 flex flex-col overflow-hidden rounded-overlay focus:outline-none data-[state=open]:animate-pop-in"
        >
          <header className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
            <div>
              <RDialog.Title className="font-display text-sm font-semibold text-ink-100">
                {place?.label ?? "Surface"}
              </RDialog.Title>
              {place && <p className="text-[11px] text-ink-500">{place.sub}</p>}
            </div>
            <RDialog.Close
              aria-label="Back to the Grove (Esc)"
              className="inline-flex size-8 items-center justify-center rounded-ctl text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100 focus-visible:outline-2 focus-visible:outline-claw-500"
            >
              <X className="size-4" />
            </RDialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{route && <Surface route={route} />}</div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
