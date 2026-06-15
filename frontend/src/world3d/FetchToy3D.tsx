/** FetchToy3D — the thrown spark for the fetch minigame. A small cyan glow that
 *  sits at the landing spot while the pet dashes out (outbound), then rides above
 *  the pet's head as it carries it home (return), and hides when idle. Frame-driven
 *  off the fetchPlay singleton (not reactive) + petPos. Reduced-motion: never shown
 *  (the pet doesn't chase). toneMapped:false so Bloom catches it. */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh, MeshStandardMaterial } from "three";
import { fetchToy } from "./fetchPlay";
import { petPos } from "./petPosition";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { WORLD } from "./palette";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";

export function FetchToy3D({ reduced }: { reduced: boolean }) {
  const ref = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const active = !reduced && fetchToy.phase !== "idle";
    m.visible = active;
    if (!active) return;

    let x: number, y: number, z: number;
    if (fetchToy.phase === "return") {
      x = petPos.x; // carried above the pet's head on the way home
      z = petPos.z;
      y = petPos.y + 0.6;
    } else {
      x = fetchToy.x; // resting at the landing spot while the pet runs out
      z = fetchToy.z;
      y = islandHeight(x, z, ISLAND_MAX_R) + 0.35;
    }
    const bob = Math.sin(state.clock.elapsedTime * 6) * 0.06;
    m.position.set(x, y + bob, z);
    m.rotation.y += 0.08;
    if (matRef.current) matRef.current.emissiveIntensity = 1.4 * glowBoost(sky.dayness);
  });

  return (
    <mesh ref={ref} visible={false}>
      <icosahedronGeometry args={[0.16, 0]} />
      <meshStandardMaterial
        ref={matRef}
        color={WORLD.botEye}
        emissive={WORLD.botEye}
        emissiveIntensity={1.4}
        toneMapped={false}
        flatShading
      />
    </mesh>
  );
}
