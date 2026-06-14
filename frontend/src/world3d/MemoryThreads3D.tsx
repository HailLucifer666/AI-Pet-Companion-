/** MemoryThreads3D — the Living Memory Web. A glowing mycelial filament between
 *  every pair of memory crystals the backend found *related* (real embedding
 *  cosine similarity, from /api/memory/graph). Thicker + brighter = more similar.
 *  Endpoints are the deterministic crystal positions, so threads sit exactly on
 *  the garden. Static (no per-frame work) — recomputed only when the crystal set
 *  or the graph changes; safe under reduced-motion's on-demand frameloop. */

import { useMemo } from "react";
import { QuadraticBezierLine } from "@react-three/drei";
import { useWorldStore } from "../state/worldStore";
import { crystalPosition } from "./crystalPlacement";
import { threadArc, type Vec3 } from "./thread";

const THREAD_COLOR = 0x6be9ff; // mycelial cyan
const Y_LIFT = 0.7; // raise the endpoint to the crystal's body, not its base

interface Thread {
  key: string;
  start: Vec3;
  end: Vec3;
  mid: Vec3; // arc control point — lifts the filament over the terrain
  sim: number;
}

export function MemoryThreads3D() {
  const crystals = useWorldStore((s) => s.crystals);
  const threads = useWorldStore((s) => s.threads);

  const lines = useMemo<Thread[]>(() => {
    const posById = new Map<number, Vec3>();
    for (const c of crystals) {
      const p = crystalPosition(c.seed);
      posById.set(c.id, [p.x, p.y + Y_LIFT, p.z]);
    }
    const out: Thread[] = [];
    for (const e of threads) {
      const a = posById.get(e.a);
      const b = posById.get(e.b);
      if (a && b) out.push({ key: `${e.a}-${e.b}`, start: a, end: b, mid: threadArc(a, b), sim: e.sim });
    }
    return out;
  }, [crystals, threads]);

  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((l) => (
        <QuadraticBezierLine
          key={l.key}
          start={l.start}
          end={l.end}
          mid={l.mid}
          color={THREAD_COLOR}
          lineWidth={0.7 + l.sim * 1.8}
          transparent
          opacity={0.18 + l.sim * 0.34}
        />
      ))}
    </group>
  );
}
