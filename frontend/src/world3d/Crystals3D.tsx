/** Crystals3D — the memory garden in 3D. One faceted, emissive crystal per kept
 *  memory, its species (shape) and spot fixed by the memory id. Reads the live
 *  worldStore.crystals (hydrated from REST on Den open, then planted/folded by the
 *  Synapse stream), so the garden is exactly what the companion remembers. Each
 *  crystal pops in on mount and turns slowly. Reduced-motion → static, full size. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group } from "three";
import { useWorldStore } from "../state/worldStore";
import { mulberry32 } from "../world/engine/rng";
import { SPECIES, type CrystalSeed } from "../world/entities/crystalSeed";
import { crystalPosition, CRYSTAL_COLOR } from "./crystalPlacement";

const BASE = 0.7;

function Shape({ seed }: { seed: CrystalSeed }) {
  const kind = (SPECIES[seed.memoryType] ?? SPECIES.fact).kind;
  const color = CRYSTAL_COLOR[seed.memoryType];
  const mat = (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={0.7}
      flatShading
      transparent
      opacity={0.92}
      roughness={0.35}
    />
  );
  switch (kind) {
    case "monolith":
      return (
        <mesh castShadow position-y={0.55}>
          <boxGeometry args={[0.32, 1.1, 0.32]} />
          {mat}
        </mesh>
      );
    case "gem":
      return (
        <mesh castShadow position-y={0.45}>
          <octahedronGeometry args={[0.42, 0]} />
          {mat}
        </mesh>
      );
    case "grove":
      return (
        <group>
          {[-0.18, 0, 0.18].map((dx, i) => (
            <mesh key={i} castShadow position={[dx, 0.32 + i * 0.05, 0]}>
              <coneGeometry args={[0.12, 0.6 + i * 0.12, 4]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case "spire":
      return (
        <mesh castShadow position-y={0.6}>
          <coneGeometry args={[0.15, 1.2, 4]} />
          {mat}
        </mesh>
      );
    default: // quartz
      return (
        <mesh castShadow position-y={0.3}>
          <cylinderGeometry args={[0.26, 0.3, 0.6, 6]} />
          {mat}
        </mesh>
      );
  }
}

function Crystal({ seed }: { seed: CrystalSeed }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<Group>(null);
  const grow = useRef(reduced ? 1 : 0);
  const pos = useMemo(() => crystalPosition(seed.seed), [seed.seed]);
  const spin = useMemo(() => 0.15 + mulberry32(seed.seed)() * 0.4, [seed.seed]);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    if (grow.current < 1) {
      grow.current = Math.min(1, grow.current + delta * 2.4);
      g.scale.setScalar(BASE * (1 - Math.pow(1 - grow.current, 3)));
    }
    if (!reduced) {
      g.rotation.y += delta * spin;
      g.position.y = pos.y + Math.sin(state.clock.elapsedTime * 1.3 + seed.id) * 0.03;
    }
  });

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} scale={reduced ? BASE : 0}>
      <Shape seed={seed} />
    </group>
  );
}

export function Crystals3D() {
  const crystals = useWorldStore((s) => s.crystals);
  return (
    <group>
      {crystals.map((c) => (
        <Crystal key={c.id} seed={c} />
      ))}
    </group>
  );
}
