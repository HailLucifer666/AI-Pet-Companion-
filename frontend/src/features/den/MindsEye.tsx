/** MindsEye â€” press M to look into the companion's mind: a connectogram of the
 *  real memories. Nodes are placed on a ring grouped by type, sized + brightened
 *  by stored confidence; edges are the real embedding-similarity links from
 *  /api/memory/graph (opacity âˆ similarity). Hovering a memory highlights its
 *  links and shows its text. Pure overlay (DOM/SVG) â€” no 3D, no pet. Esc / âœ• /
 *  backdrop closes. Honors reduced-motion (the global rule freezes transitions). */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, type MemoryType } from "../../lib/api";
import { CRYSTAL_COLOR } from "../../world3d/crystalPlacement";

const TYPE_ORDER: MemoryType[] = ["identity", "preference", "project", "event", "fact"];
const TYPE_LABEL: Record<MemoryType, string> = {
  identity: "Identity",
  preference: "Preference",
  project: "Project",
  event: "Event",
  fact: "Fact",
};
const CX = 400;
const CY = 400;
const R = 320;

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

interface Placed {
  id: number;
  x: number;
  y: number;
  type: MemoryType;
  confidence: number;
}

export function MindsEye({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const graph = useQuery({ queryKey: queryKeys.memoryGraph, queryFn: api.memoryGraph, enabled: open });
  const mem = useQuery({ queryKey: queryKeys.memory("", ""), queryFn: () => api.memory(), enabled: open });

  const contentById = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of mem.data?.memories ?? []) m.set(x.id, x.content);
    return m;
  }, [mem.data]);

  const placed = useMemo<Placed[]>(() => {
    const nodes = [...(graph.data?.nodes ?? [])].sort(
      (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.id - b.id,
    );
    const n = nodes.length;
    if (n === 0) return [];
    // Cluster each memory type into its own arc, with a gap between clusters so
    // the kinds read as distinct constellations rather than one even ring.
    let groups = 0;
    for (let i = 0; i < n; i++) if (i === 0 || nodes[i].type !== nodes[i - 1].type) groups++;
    const GAP = 1.4; // a between-cluster gap is 1.4 node-steps wide
    const unit = (Math.PI * 2) / (n + groups * GAP);
    let ang = -Math.PI / 2;
    return nodes.map((node, i) => {
      if (i === 0 || node.type !== nodes[i - 1].type) ang += unit * GAP;
      const a = ang;
      ang += unit;
      return {
        id: node.id,
        x: CX + R * Math.cos(a),
        y: CY + R * Math.sin(a),
        type: node.type,
        confidence: node.confidence,
      };
    });
  }, [graph.data]);

  const posById = useMemo(() => {
    const m = new Map<number, Placed>();
    for (const p of placed) m.set(p.id, p);
    return m;
  }, [placed]);

  if (!open) return null;

  const edges = graph.data?.edges ?? [];
  const empty = !graph.isLoading && placed.length === 0;
  const presentTypes = TYPE_ORDER.filter((t) => placed.some((p) => p.type === t));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The Mind's Eye â€” your companion's memory graph"
      className="absolute inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative flex max-h-[92%] w-[92%] max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="glow-soft font-display text-lg font-semibold text-ink-100">The Mind's Eye</h2>
            <p className="text-xs text-ink-400">
              {placed.length} memories Â· links by real similarity Â· hover to read
            </p>
            {presentTypes.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1" aria-label="Memory kinds">
                {presentTypes.map((t) => (
                  <li key={t} className="flex items-center gap-1.5 text-[11px] text-ink-400">
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{ backgroundColor: hex(CRYSTAL_COLOR[t]), boxShadow: `0 0 6px ${hex(CRYSTAL_COLOR[t])}` }}
                      aria-hidden
                    />
                    {TYPE_LABEL[t]}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close the Mind's Eye"
            className="rounded-full border border-claw-500/40 bg-ink-900/70 px-3 py-1 font-display text-xs text-ink-200 hover:border-claw-400 hover:bg-claw-600/30 focus-visible:outline-2 focus-visible:outline-claw-400"
          >
            âœ• Esc
          </button>
        </div>

        {empty ? (
          <p className="rounded-xl border border-ink-700/50 bg-ink-900/60 p-8 text-center text-sm text-ink-400">
            No memories yet â€” talk with your companion and the web will grow.
          </p>
        ) : (
          <svg viewBox="0 0 800 800" className="aspect-square w-full" role="img" aria-label="Memory similarity graph">
            <defs>
              <filter id="me-node-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="7" />
              </filter>
            </defs>
            {edges.map((e) => {
              const a = posById.get(e.a);
              const b = posById.get(e.b);
              if (!a || !b) return null;
              const lit = hovered === null || hovered === e.a || hovered === e.b;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const cx = mx + (CX - mx) * 0.45; // bow the chord toward centre
              const cy = my + (CY - my) * 0.45;
              return (
                <path
                  key={`${e.a}-${e.b}`}
                  d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                  fill="none"
                  stroke="#6be9ff"
                  strokeWidth={0.5 + e.sim * 2.5}
                  opacity={lit ? 0.12 + e.sim * 0.5 : 0.04}
                />
              );
            })}
            {placed.map((p) => {
              const lit = hovered === null || hovered === p.id;
              const r = 6 + p.confidence * 7;
              const color = hex(CRYSTAL_COLOR[p.type]);
              return (
                <g
                  key={p.id}
                  onMouseEnter={() => setHovered(p.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={p.x} cy={p.y} r={r * 2} fill={color} opacity={lit ? 0.28 : 0.08} filter="url(#me-node-glow)" />
                  <circle cx={p.x} cy={p.y} r={r} fill={color} opacity={lit ? 0.6 + p.confidence * 0.4 : 0.25} />
                  <title>{`${TYPE_LABEL[p.type]}: ${contentById.get(p.id) ?? "â€¦"}`}</title>
                </g>
              );
            })}
          </svg>
        )}

        {hovered !== null && (
          <p className="mt-2 truncate rounded-lg border border-ink-700/50 bg-ink-900/80 px-3 py-2 text-center text-sm text-ink-200">
            <span className="text-claw-300">{(() => { const t = posById.get(hovered)?.type; return t ? TYPE_LABEL[t] : ""; })()}</span> Â· {contentById.get(hovered) ?? "â€¦"}
          </p>
        )}
      </div>
    </div>
  );
}
