/** World3D — the 3D Grove's canvas: dusk sky + fog, a warm sun casting soft
 *  shadows, and an orbit camera that slowly drifts around the island. Reduced-
 *  motion stops the auto-orbit and renders on demand (still draggable). The whole
 *  three.js stack is lazy-loaded with the Den, never in the main bundle. */

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { WORLD } from "./palette";
import { Island } from "./Island";
import { Lumenform3D } from "./Lumenform3D";
import { Crystals3D } from "./Crystals3D";

export function World3D() {
  const reduced = useReducedMotion() ?? false;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={reduced ? "demand" : "always"}
      camera={{ position: [15, 12, 15], fov: 42, near: 0.1, far: 140 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[WORLD.sky]} />
      <fog attach="fog" args={[WORLD.fog, 26, 78]} />

      <hemisphereLight color={WORLD.sky} groundColor={0x141414} intensity={0.7} />
      <ambientLight color={WORLD.ambient} intensity={0.35} />
      <directionalLight
        color={WORLD.sun}
        intensity={1.6}
        position={[18, 26, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />

      <Island />
      <Lumenform3D />
      <Crystals3D />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reduced}
        autoRotateSpeed={0.35}
        minDistance={10}
        maxDistance={34}
        minPolarAngle={0.45}
        maxPolarAngle={1.32}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
