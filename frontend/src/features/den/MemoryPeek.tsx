/** MemoryPeek — click a memory crystal in the Den and read the REAL memory it
 *  stands for. Reads the selected memory_id from the memoryPeek store (set by an
 *  in-canvas crystal click), looks it up in the already-cached memory list, and
 *  shows its type, content and age in a glass card. Nothing faked — this is the
 *  actual row the companion remembers. Esc or the close button dismisses it.
 *  Keyboard users reach the same memories through the rail's Memory surface. */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api, queryKeys, type MemoryType } from "../../lib/api";
import { useMemoryPeek } from "../../state/memoryPeek";
import { parseSqliteUtc } from "../../world3d/compost";

const TYPE_LABEL: Record<MemoryType, string> = {
  identity: "Identity",
  preference: "Preference",
  project: "Project",
  event: "Event",
  fact: "Fact",
};

function ageLabel(created: string | null | undefined): string {
  const ms = parseSqliteUtc(created ?? null);
  if (!ms) return "";
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(ms).toLocaleDateString();
}

export function MemoryPeek() {
  const id = useMemoryPeek((s) => s.id);
  const close = useMemoryPeek((s) => s.close);

  // The same cached query the Memory surface uses — no extra fetch in the common case.
  const { data } = useQuery({
    queryKey: queryKeys.memory("", ""),
    queryFn: () => api.memory(),
    enabled: id !== null,
  });

  useEffect(() => {
    if (id === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, close]);

  if (id === null) return null;
  const memory = data?.memories.find((m) => m.id === id);

  return (
    <div
      role="dialog"
      aria-label="Memory"
      style={{ boxShadow: "var(--shadow-glow)" }}
      className="pointer-events-auto absolute left-1/2 top-20 z-50 w-[min(22rem,calc(100%-2.5rem))] -translate-x-1/2 select-text rounded-2xl border border-claw-500/30 bg-ink-950/85 p-4 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full border border-claw-500/40 bg-claw-600/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-claw-200">
          {memory ? TYPE_LABEL[memory.type] : "Memory"}
        </span>
        <button
          onClick={close}
          aria-label="Close memory"
          className="-mr-1 -mt-1 rounded-full p-1 text-ink-400 transition-colors hover:text-ink-100 focus-visible:outline-2 focus-visible:outline-claw-400"
        >
          <X size={15} />
        </button>
      </div>

      {memory ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-ink-100">{memory.content}</p>
          <p className="mt-2 text-[11px] text-ink-500">
            {ageLabel(memory.created_at)} · {Math.round(memory.confidence * 100)}% confidence
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-ink-400">
          This crystal just formed — open the Memory surface from the rail to read it.
        </p>
      )}
    </div>
  );
}
