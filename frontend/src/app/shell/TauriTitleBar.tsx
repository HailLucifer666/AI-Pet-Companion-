import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { IconButton } from "../../components/ui";

// Detect if we are inside the Tauri webview
const isTauri = !!(window as any).__TAURI_INTERNALS__;

export function TauriTitleBar() {
  if (!isTauri) return null;

  return (
    <div 
      className="absolute top-4 right-4 z-[100] flex items-center gap-1 rounded-full bg-ink-900/80 p-1 backdrop-blur-md shadow-xl border border-ink-800/50 transition-opacity hover:opacity-100 opacity-60"
      data-tauri-drag-region
      title="Drag window"
    >
      <div 
        className="px-2 cursor-grab active:cursor-grabbing text-ink-500 text-xs font-medium tracking-wide uppercase pointer-events-none select-none" 
        data-tauri-drag-region
      >
        Drag
      </div>
      <div className="h-4 w-px bg-ink-800/80 mr-1" aria-hidden />
      
      <IconButton
        icon={Minus}
        label="Minimize"
        onClick={() => getCurrentWindow().minimize()}
      />
      <IconButton
        icon={Square}
        label="Maximize"
        onClick={() => getCurrentWindow().toggleMaximize()}
      />
      <IconButton
        icon={X}
        label="Close"
        onClick={() => getCurrentWindow().close()}
      />
    </div>
  );
}
