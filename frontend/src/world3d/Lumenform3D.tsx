/** Lumenform3D — the companion, living on the island. A small low-poly creature
 *  that *is* a light: an ember-emissive body plus a real point light, so it glows
 *  on the ground around it. It reads the live FSM (worldStore.lumen / stage — the
 *  same state the rail creature uses) and animates: calm bob at rest, quick bob +
 *  brighter glow while working, a hop when celebrating, a dim settle when napping.
 *  Walking between 3D Places comes in slice 4. Reduced-motion → still + steady glow.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { WORLD } from "./palette";

const HOME = { x: 1.6, z: 2.6 };
const LIFT = 0.55; // raise the body so it sits on the ground, not in it

export function Lumenform3D() {
  const reduced = useReducedMotion() ?? false;
  const stage = useWorldStore((s) => s.stage);

  const homeY = useMemo(() => islandHeight(HOME.x, HOME.z, ISLAND_MAX_R), []);
  const baseScale = 0.72 + stage * 0.12; // grows with life stage

  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const { lumen } = useWorldStore.getState();
    const t = state.clock.elapsedTime;

    if (reduced) {
      g.position.set(HOME.x, homeY + LIFT, HOME.z);
      if (light.current) light.current.intensity = 2.2;
      if (mat.current) mat.current.emissiveIntensity = 0.8;
      return;
    }

    const working = lumen.mode === "work";
    const gesture = lumen.gesture;

    const bob = Math.sin(t * (working ? 5 : 2.2)) * (working ? 0.1 : 0.06);
    let hop = 0;
    if (gesture === "celebrate") hop = Math.abs(Math.sin(t * 9)) * 0.45;
    else if (gesture === "play") hop = Math.abs(Math.sin(t * 7)) * 0.22;
    const settle = gesture === "nap" ? -0.25 : 0;
    g.position.set(HOME.x, homeY + LIFT + bob + hop + settle, HOME.z);

    if (body.current) {
      const breathe = 1 + Math.sin(t * 2) * 0.04;
      body.current.scale.setScalar(breathe);
    }

    const targetGlow =
      gesture === "nap" ? 0.6 : gesture === "celebrate" ? 4 : working ? 3.2 : 1.8;
    if (light.current) light.current.intensity += (targetGlow - light.current.intensity) * 0.08;
    if (mat.current) {
      const e = gesture === "nap" ? 0.3 : working ? 1.1 : 0.7;
      mat.current.emissiveIntensity += (e - mat.current.emissiveIntensity) * 0.08;
    }
  });

  return (
    <group ref={group} position={[HOME.x, homeY + LIFT, HOME.z]} scale={baseScale}>
      {/* the living light */}
      <pointLight ref={light} color={WORLD.ember} intensity={1.8} distance={7} decay={2} position={[0, 0.2, 0]} />

      {/* body */}
      <mesh ref={body} castShadow scale-y={0.9}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          ref={mat}
          color={WORLD.ember}
          emissive={WORLD.ember}
          emissiveIntensity={0.7}
          flatShading
          roughness={0.5}
        />
      </mesh>

      {/* eyes */}
      <mesh position={[-0.16, 0.08, 0.42]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={0x14161d} />
      </mesh>
      <mesh position={[0.16, 0.08, 0.42]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={0x14161d} />
      </mesh>

      {/* ears appear from the Juvenile stage */}
      {stage >= 2 && (
        <>
          <mesh position={[-0.26, 0.46, 0]} rotation-z={0.3} castShadow>
            <coneGeometry args={[0.14, 0.34, 5]} />
            <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading />
          </mesh>
          <mesh position={[0.26, 0.46, 0]} rotation-z={-0.3} castShadow>
            <coneGeometry args={[0.14, 0.34, 5]} />
            <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading />
          </mesh>
        </>
      )}
    </group>
  );
}
