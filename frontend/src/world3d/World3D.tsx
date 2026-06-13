/** World3D — the 3D Grove's canvas: dusk sky + fog, a warm sun casting soft
 *  shadows, and a camera that *follows the companion* as it roams (you can still
 *  drag to orbit / scroll to zoom — the rig just keeps the pet framed). When the
 *  pet settles and you stop touching the view, the camera drifts slowly for a
 *  cinematic idle. Reduced-motion snaps and renders on demand. The whole three.js
 *  stack is lazy-loaded with the Den, never in the main bundle. */

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Vector3 } from "three";
import { WORLD } from "./palette";
import { Island } from "./Island";
import { Lumenform3D } from "./Lumenform3D";
import { Crystals3D } from "./Crystals3D";
import { Places3D } from "./Places3D";
import { Particles3D } from "./Particles3D";
import { Postfx } from "./Postfx";
import { petPos } from "./petPosition";

interface ControlsLike {
  target: Vector3;
  update: () => void;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const FOLLOW_RATE = 3; // how briskly the pivot chases the pet (per second)
const IDLE_AFTER = 6; // seconds of no input + settled pet before the camera drifts
const IDLE_DRIFT = 0.05; // rad/sec — a slow cinematic orbit

/** Keeps the pet framed: each frame it pans BOTH the orbit pivot and the camera
 *  by the same delta, so following never changes the angle or zoom you chose
 *  (the fix for the island sliding off when you orbit). Idle → a slow drift. */
function CameraRig({ reduced }: { reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const followed = useRef(new Vector3());
  const want = useRef(new Vector3());
  const lastPetXZ = useRef(new Vector3());
  const lastInput = useRef(0);
  const elapsed = useRef(0);
  const inited = useRef(false);

  // Any orbit/zoom interaction stamps the clock so the idle drift backs off.
  useEffect(() => {
    if (!controls) return;
    const stamp = () => {
      lastInput.current = elapsed.current;
    };
    controls.addEventListener("start", stamp);
    controls.addEventListener("end", stamp);
    return () => {
      controls.removeEventListener("start", stamp);
      controls.removeEventListener("end", stamp);
    };
  }, [controls]);

  useFrame((state, delta) => {
    if (!controls) return;
    const t = state.clock.elapsedTime;
    elapsed.current = t;
    const dt = Math.min(delta, 0.05);

    want.current.set(petPos.x, petPos.y + 0.6, petPos.z);
    if (!inited.current) {
      followed.current.copy(want.current);
      controls.target.copy(want.current);
      lastPetXZ.current.set(petPos.x, 0, petPos.z);
      inited.current = true;
    }

    const k = reduced ? 1 : 1 - Math.exp(-FOLLOW_RATE * dt);
    followed.current.lerp(want.current, k);

    // Pan rig: move camera + target by the same delta → keeps the pet centered
    // without disturbing the user's chosen orbit angle or zoom.
    const dx = followed.current.x - controls.target.x;
    const dy = followed.current.y - controls.target.y;
    const dz = followed.current.z - controls.target.z;
    controls.target.x += dx;
    controls.target.y += dy;
    controls.target.z += dz;
    camera.position.x += dx;
    camera.position.y += dy;
    camera.position.z += dz;

    if (!reduced) {
      const moved = Math.hypot(petPos.x - lastPetXZ.current.x, petPos.z - lastPetXZ.current.z);
      lastPetXZ.current.set(petPos.x, 0, petPos.z);
      const settled = moved < 0.005; // pet's idle bob doesn't move it on the ground plane
      if (settled && t - lastInput.current > IDLE_AFTER) {
        const a = IDLE_DRIFT * dt;
        const ox = camera.position.x - controls.target.x;
        const oz = camera.position.z - controls.target.z;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        camera.position.x = controls.target.x + ox * cos - oz * sin;
        camera.position.z = controls.target.z + ox * sin + oz * cos;
      }
    }

    controls.update();
  });

  return null;
}

export function World3D() {
  const reduced = useReducedMotion() ?? false;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={reduced ? "demand" : "always"}
      camera={{ position: [14, 11, 14], fov: 42, near: 0.1, far: 140 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[WORLD.sky]} />
      {/* Fog ends before the sea's far reaches, so the endless water dissolves
          into the sky — no visible horizon edge, at any angle or zoom. */}
      <fog attach="fog" args={[WORLD.fog, 34, 90]} />

      <hemisphereLight color={WORLD.sky} groundColor={0x232a1c} intensity={0.85} />
      <ambientLight color={WORLD.ambient} intensity={0.5} />
      <directionalLight
        color={WORLD.sun}
        intensity={1.45}
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
      {/* Cool back-rim — lifts the low-poly silhouettes out of the indigo fog. */}
      <directionalLight color={WORLD.rim} intensity={0.55} position={[-14, 7, -16]} />

      <Island />
      <Lumenform3D />
      <Crystals3D />
      <Places3D />
      <Particles3D />

      <CameraRig reduced={reduced} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={26}
        minPolarAngle={0.6}
        maxPolarAngle={1.15}
      />

      <Postfx />
    </Canvas>
  );
}
