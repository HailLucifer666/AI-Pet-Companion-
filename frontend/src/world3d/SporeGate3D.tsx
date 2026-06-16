/** SporeGate3D — the Spore Gate: a luminous low-poly arch at the back of the
 *  meadow whose inner light *fills with real XP*. Its fill height tracks the
 *  companion's progress toward the next level (worldStore.xpFrac); on a level-up
 *  (pet.levelup) it blooms — a bright flash + a brief swell. Mycelium pulses from
 *  real agent events stream into its glowing centre (GATE_POINT). Ember palette,
 *  brighter at night via glowBoost. Reduced-motion → fill sits at value, no flash. */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { glowBoost } from "./daylight";
import { bloomFlash, bloomGateScale } from "./bloomCinematic";
import { sky } from "./skyState";
import { GATE_POINT } from "./pulse";
import { WORLD } from "./palette";

const GX = GATE_POINT.x;
const GZ = GATE_POINT.z;
const FILL_MAX = 3.6; // tallest the inner light climbs (world units)
const BLOOM_MS = 1400;

const nowMs = () => (typeof performance !== "undefined" ? performance.now() : 0);

export function SporeGate3D() {
  const reduced = useReducedMotion() ?? false;
  const invalidate = useThree((s) => s.invalidate);
  const baseY = islandHeight(GX, GZ, ISLAND_MAX_R);
  const coreLocalY = GATE_POINT.y - baseY; // GATE_POINT is world-space; group sits at baseY

  // Under reduced-motion the canvas renders on demand, so a real XP change must
  // queue a frame for the fill/bloom to apply (useFrame reads the store via getState).
  useEffect(
    () =>
      useWorldStore.subscribe((s, p) => {
        if (s.xpFrac !== p.xpFrac || s.bloomAt !== p.bloomAt) invalidate();
      }),
    [invalidate],
  );

  const group = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  const fillMat = useRef<MeshStandardMaterial>(null);
  const coreMat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  const shown = useRef(0); // eased xpFrac

  useFrame((state, delta) => {
    const { xpFrac, bloomAt } = useWorldStore.getState();
    const dt = Math.min(delta, 0.05);
    const boost = glowBoost(sky.dayness);

    // Ease the displayed fill toward the real fraction (snap under reduced-motion).
    shown.current += (xpFrac - shown.current) * (reduced ? 1 : 1 - Math.exp(-3 * dt));
    const h = Math.max(0.001, shown.current * FILL_MAX);
    if (fill.current) {
      fill.current.scale.y = h;
      fill.current.position.y = h / 2; // grow up from the base
    }

    // Bloom: a cubic-out flash that pops then decays over BLOOM_MS after a level-up.
    const since = nowMs() - bloomAt;
    const flash = !reduced && bloomAt > 0 ? bloomFlash(since, BLOOM_MS) : 0;

    if (fillMat.current) fillMat.current.emissiveIntensity = (1.4 + flash * 3) * boost;
    if (coreMat.current) coreMat.current.emissiveIntensity = (1.0 + flash * 3) * boost;
    if (light.current) {
      const breathe = reduced ? 0 : Math.sin(state.clock.elapsedTime * 2) * 0.3;
      light.current.intensity = 2.2 + breathe + flash * 8;
    }
    if (group.current) group.current.scale.setScalar(bloomGateScale(flash));
  });

  return (
    <group ref={group} position={[GX, baseY, GZ]}>
      {/* two pillars + a lintel — the arch frame */}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 2.1, 0]} castShadow>
          <boxGeometry args={[0.34, 4.2, 0.34]} />
          <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 4.3, 0]} castShadow>
        <boxGeometry args={[2.9, 0.34, 0.34]} />
        <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading metalness={0.3} roughness={0.5} />
      </mesh>

      {/* inner XP fill — a glowing curtain that climbs from the base with xpFrac */}
      <mesh ref={fill} position={[0, 0.001, 0]} scale={[1, 0.001, 1]}>
        <boxGeometry args={[1.7, 1, 0.18]} />
        <meshStandardMaterial
          ref={fillMat}
          color={WORLD.emberHi}
          emissive={WORLD.emberHi}
          emissiveIntensity={1.4}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* glowing core where pulses arrive */}
      <mesh position={[0, coreLocalY, 0]}>
        <icosahedronGeometry args={[0.36, 1]} />
        <meshStandardMaterial ref={coreMat} color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={1.0} flatShading transparent opacity={0.85} />
      </mesh>
      <pointLight ref={light} color={WORLD.ember} intensity={2.2} distance={11} decay={2} position={[0, coreLocalY, 0]} />
    </group>
  );
}
