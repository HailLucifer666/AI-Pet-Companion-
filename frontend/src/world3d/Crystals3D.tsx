/** Crystals3D — the memory garden in 3D. One faceted, emissive crystal per kept
 *  memory, its species (shape) and spot fixed by the memory id. Reads the live
 *  worldStore.crystals (hydrated from REST on Den open, then planted/folded by the
 *  Synapse stream), so the garden is exactly what the companion remembers. Each
 *  crystal pops in on mount and turns slowly. Reduced-motion → static, full size. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group, MeshStandardMaterial } from "three";
import { freshCrystals, useWorldStore } from "../state/worldStore";
import { mulberry32 } from "../world/engine/rng";
import { SPECIES, type CrystalSeed } from "../world/entities/crystalSeed";
import { crystalPosition, CRYSTAL_COLOR } from "./crystalPlacement";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";

const BASE = 0.7;
const CRYSTAL_EMISSIVE = 0.95; // base glow; ×glowBoost so crystals blaze at night

function Shape({ seed, matRef }: { seed: CrystalSeed; matRef: React.RefObject<MeshStandardMaterial> }) {
  const kind = (SPECIES[seed.memoryType] ?? SPECIES.fact).kind;
  const color = CRYSTAL_COLOR[seed.memoryType];
  const mat = (
    <meshStandardMaterial
      ref={matRef}
      color={color}
      emissive={color}
      emissiveIntensity={CRYSTAL_EMISSIVE}
      flatShading
      transparent
      opacity={0.8}
      roughness={0.15}
      metalness={0.1}
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
  const matRef = useRef<MeshStandardMaterial>(null);
  const grow = useRef(reduced ? 1 : 0);
  const flash = useRef(0); // one-shot bloom when planted live (not on REST hydration)
  const consumed = useRef(false);
  const pos = useMemo(() => crystalPosition(seed.seed), [seed.seed]);
  const spin = useMemo(() => 0.15 + mulberry32(seed.seed)() * 0.4, [seed.seed]);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    if (!consumed.current) {
      consumed.current = true;
      if (!reduced && freshCrystals.has(seed.id)) flash.current = 1; // a memory just formed here
      freshCrystals.delete(seed.id);
    }
    if (grow.current < 1) {
      grow.current = Math.min(1, grow.current + delta * 2.4);
      g.scale.setScalar(BASE * (1 - Math.pow(1 - grow.current, 3)));
    }
    if (flash.current > 0) flash.current = Math.max(0, flash.current - delta * 1.4);
    if (matRef.current) {
      matRef.current.emissiveIntensity = CRYSTAL_EMISSIVE * glowBoost(sky.dayness) * (1 + flash.current * 3);
    }
    if (!reduced) {
      g.rotation.y += delta * spin;
      g.position.y = pos.y + Math.sin(state.clock.elapsedTime * 1.3 + seed.id) * 0.03;
    }
  });

  return (
    <group ref={ref} position={[pos.x, pos.y, pos.z]} scale={reduced ? BASE : 0}>
      <Shape seed={seed} matRef={matRef} />
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
