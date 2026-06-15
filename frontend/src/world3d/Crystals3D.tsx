/** Crystals3D â€” the memory garden in 3D. One faceted, emissive crystal per kept
 *  memory, its species (shape) and spot fixed by the memory id. Reads the live
 *  worldStore.crystals (hydrated from REST on Den open, then planted/folded by the
 *  Synapse stream), so the garden is exactly what the companion remembers. Each
 *  crystal pops in on mount and turns slowly. Reduced-motion â†’ static, full size. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group, MeshStandardMaterial } from "three";
import { freshCrystals, useWorldStore } from "../state/worldStore";
import { useMemoryPeek } from "../state/memoryPeek";
import { mulberry32 } from "../world/engine/rng";
import { SPECIES, type CrystalSeed } from "../world/entities/crystalSeed";
import { crystalPosition, CRYSTAL_COLOR } from "./crystalPlacement";
import { compostSpec, freshness } from "./compost";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";

const BASE = 0.7;
const CRYSTAL_EMISSIVE = 0.95; // base glow; Ã—glowBoost so crystals blaze at night

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

function Crystal({ seed, fresh }: { seed: CrystalSeed; fresh: number }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<Group>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const grow = useRef(reduced ? 1 : 0);
  const flash = useRef(0); // one-shot bloom when planted live (not on REST hydration)
  const consumed = useRef(false);
  const pos = useMemo(() => crystalPosition(seed.seed), [seed.seed]);
  const spin = useMemo(() => 0.15 + mulberry32(seed.seed)() * 0.4, [seed.seed]);

  // Compost: the longer a memory goes unaccessed, the more its crystal sinks toward
  // the roots, shrinks, and dims (real recency). `fresh` (0..1) comes from the store.
  const compost = compostSpec(fresh);
  const sunkY = pos.y - compost.sink;

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    if (!consumed.current) {
      consumed.current = true;
      if (!reduced && freshCrystals.has(seed.id)) flash.current = 1; // a memory just formed here
      freshCrystals.delete(seed.id);
    }
    if (grow.current < 1) grow.current = Math.min(1, grow.current + delta * 2.4);
    const ease = 1 - Math.pow(1 - grow.current, 3);
    g.scale.setScalar(BASE * compost.scale * ease);
    if (flash.current > 0) flash.current = Math.max(0, flash.current - delta * 1.4);
    if (matRef.current) {
      matRef.current.emissiveIntensity =
        CRYSTAL_EMISSIVE * compost.dim * glowBoost(sky.dayness) * (1 + flash.current * 3);
    }
    g.position.y = sunkY + (reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.3 + seed.id) * 0.03);
    if (!reduced) g.rotation.y += delta * spin;
  });

  // Click a crystal to read its real memory (the id IS the memory_id). Hover shows a
  // pointer cursor as the affordance; keyboard users read memories via the rail's
  // Memory surface (canvas hit-areas can't take focus).
  const peek = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    useMemoryPeek.getState().open(seed.id);
  };
  const cursor = (on: boolean) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.style.cursor = on ? "pointer" : "";
  };

  return (
    <group
      ref={ref}
      position={[pos.x, sunkY, pos.z]}
      scale={reduced ? BASE * compost.scale : 0}
      onClick={peek}
      onPointerOver={cursor(true)}
      onPointerOut={cursor(false)}
    >
      <Shape seed={seed} matRef={matRef} />
    </group>
  );
}

export function Crystals3D() {
  const crystals = useWorldStore((s) => s.crystals);
  const recencyById = useWorldStore((s) => s.recencyById);
  const nowMs = Date.now(); // recency moves over days â€” once per render is plenty
  return (
    <group>
      {crystals.map((c) => (
        <Crystal key={c.id} seed={c} fresh={freshness(recencyById[c.id] ?? null, nowMs)} />
      ))}
    </group>
  );
}
