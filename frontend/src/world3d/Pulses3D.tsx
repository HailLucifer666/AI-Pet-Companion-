/** Pulses3D — Mycelium pulses: a glowing mote for each real agent event (a tool
 *  starting, a memory forming, a skill drafting) that travels from its origin on
 *  the island, through the companion, into the Spore Gate. Fed by a small capped
 *  ring buffer in worldStore (real events only — never faked). Path is the pure
 *  `pulse.ts`. Reduced-motion → a brief static glow at the origin, no travel. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { AdditiveBlending, type Mesh } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { petPos } from "./petPosition";
import { pulseDone, pulsePoint, pulseT, type PulseOrigin, type Vec3 } from "./pulse";
import { WORLD } from "./palette";

// Where each event kind originates on the island (≈ its Place marker).
const ORIGIN_XZ: Record<PulseOrigin, [number, number]> = {
  workbench: [-4, 3.8],
  garden: [4.5, -3.3],
  hollow: [-5, -2.5],
};

function originPoint(o: PulseOrigin): Vec3 {
  const [x, z] = ORIGIN_XZ[o];
  return { x, y: islandHeight(x, z, ISLAND_MAX_R) + 0.4, z };
}

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : 0);

function Mote({ origin, bornMs, reduced }: { origin: PulseOrigin; bornMs: number; reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  const start = useMemo(() => originPoint(origin), [origin]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const t = pulseT(bornMs, nowMs());

    if (reduced) {
      // No travel: a brief glow at the origin that fades over the lifetime.
      m.position.set(start.x, start.y, start.z);
      m.visible = !pulseDone(t);
      m.scale.setScalar(0.16 * (1 - t));
      return;
    }

    if (pulseDone(t)) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const p = pulsePoint(t, start, petPos);
    m.position.set(p.x, p.y, p.z);
    m.scale.setScalar(0.06 + 0.2 * Math.sin(t * Math.PI)); // swell mid-flight, taper at the ends
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={WORLD.emberHi} transparent opacity={0.9} depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

export function Pulses3D() {
  const reduced = useReducedMotion() ?? false;
  const pulses = useWorldStore((s) => s.pulses);
  return (
    <group>
      {pulses.map((p) => (
        <Mote key={p.id} origin={p.origin} bornMs={p.bornMs} reduced={reduced} />
      ))}
    </group>
  );
}
