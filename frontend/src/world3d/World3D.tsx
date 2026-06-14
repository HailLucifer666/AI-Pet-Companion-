/** World3D — the 3D Grove's canvas: sky + fog, a warm sun casting soft shadows,
 *  and a high-diorama camera that *frames the whole island* from a steep 3/4
 *  angle. The companion roams within the frame (so it's always visible) rather
 *  than being chased. Drag orbits around the island, scroll eases the zoom, and
 *  once you let go it drifts in a slow cinematic orbit. Reduced-motion holds a
 *  still framed shot. The whole three.js stack is lazy-loaded with the Den. */

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { ACESFilmicToneMapping, MOUSE, Vector3 } from "three";
import { Island } from "./Island";
import { GlowMushrooms3D } from "./GlowMushrooms3D";
import { Lumenform3D } from "./Lumenform3D";
import { Crystals3D } from "./Crystals3D";
import { Places3D } from "./Places3D";
import { Particles3D } from "./Particles3D";
import { Postfx } from "./Postfx";
import { Atmosphere } from "./Atmosphere";
import { Clouds3D } from "./Clouds3D";
import { Rain3D } from "./Rain3D";
import { CursorLure } from "./CursorLure";
import { useWeather } from "./useWeather";
import { fxFor } from "./weather";
import { localHour } from "./daylight";

interface ControlsLike {
  target: Vector3;
  update: () => void;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const ZOOM_RATE = 5; // how briskly the camera glides to its target distance
const IDLE_AFTER = 6; // seconds hands-off before the camera drifts in a slow orbit
const IDLE_DRIFT = 0.05; // rad/sec — a slow cinematic orbit around the diorama
const MIN_D = 24; // closest zoom — a detail look at part of the island
const MAX_D = 70; // farthest — the whole island (radius 16) framed with margin
const DEFAULT_DIST = 46; // resting distance that frames the island
const WHEEL_SENS = 0.0012; // wheel delta → fractional distance change

// The pivot the camera frames: the island's centre. The whole island stays in
// view, so the companion is always visible as it roams — no chase needed.
const ISLAND_CENTER: [number, number, number] = [0, 1.5, 0];

const clampD = (d: number) => Math.max(MIN_D, Math.min(MAX_D, d));

/** A high-diorama rig. It holds the whole island framed from a steep 3/4 angle —
 *  the pet roams within the frame rather than being chased, so the framing never
 *  breaks. It owns an eased zoom (OrbitControls dollies in hard steps, so we own
 *  zoom here), and once you stop touching it, drifts in a slow cinematic orbit
 *  around the island. Reduced-motion → a still framed shot, no drift. */
function CameraRig({ reduced }: { reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const offset = useRef(new Vector3());
  const targetDist = useRef(DEFAULT_DIST);
  const lastInput = useRef(0);
  const elapsed = useRef(0);
  const interacting = useRef(false); // user is dragging (orbiting) right now

  // Own the wheel: ease zoom instead of OrbitControls' hard dolly steps.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDist.current = clampD(targetDist.current * (1 + e.deltaY * WHEEL_SENS));
      lastInput.current = elapsed.current;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  // Track drag start/end so the idle orbit never fights the user.
  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      interacting.current = true;
      lastInput.current = elapsed.current;
    };
    const onEnd = () => {
      interacting.current = false;
      lastInput.current = elapsed.current;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controls]);

  useFrame((state, delta) => {
    if (!controls) return;
    const t = state.clock.elapsedTime;
    elapsed.current = t;
    const dt = Math.min(delta, 0.05);

    // Pin the pivot to the island centre — the whole island stays framed; the pet
    // roams within it. The camera frames the world, it does not track the pet.
    controls.target.set(ISLAND_CENTER[0], ISLAND_CENTER[1], ISLAND_CENTER[2]);

    // Ease the camera's distance toward the wheel-set target (the buttery zoom).
    offset.current.copy(camera.position).sub(controls.target);
    const curDist = offset.current.length() || 1;
    const zk = reduced ? 1 : 1 - Math.exp(-ZOOM_RATE * dt);
    offset.current.setLength(curDist + (clampD(targetDist.current) - curDist) * zk);

    // Idle cinematic orbit: hands off long enough → drift slowly around the island.
    if (!interacting.current && !reduced && t - lastInput.current > IDLE_AFTER) {
      const a = IDLE_DRIFT * dt;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const ox = offset.current.x;
      const oz = offset.current.z;
      offset.current.x = ox * cos - oz * sin;
      offset.current.z = ox * sin + oz * cos;
    }

    camera.position.copy(controls.target).add(offset.current);
    controls.update();
  });

  return null;
}

export function World3D() {
  const reduced = useReducedMotion() ?? false;
  const weather = useWeather();
  const fx = fxFor(weather);

  // The sky tracks the real local clock; re-read each minute.
  const [hour, setHour] = useState(() => localHour(new Date()));
  useEffect(() => {
    const id = setInterval(() => setHour(localHour(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      frameloop={reduced ? "demand" : "always"}
      camera={{ position: [0, 38, 28], fov: 42, near: 0.1, far: 220 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      {/* Sky, light + fog — driven by real time of day × real weather. */}
      <Atmosphere hour={hour} fx={fx} reduced={reduced} />

      {/* Deep-sky stars — faint by day (the bright sky + fog swallow them), a real
          field at night. `fade` blends them into the horizon fog. */}
      <Stars radius={120} depth={50} count={1400} factor={3} saturation={0.2} fade speed={reduced ? 0 : 0.4} />

      <Island />
      <GlowMushrooms3D reduced={reduced} />
      <Lumenform3D />
      <Crystals3D />
      <Places3D />
      <Particles3D />
      <Clouds3D amount={fx.clouds} reduced={reduced} />
      <Rain3D rain={fx.rain} lightning={fx.lightning} reduced={reduced} />

      <CameraRig reduced={reduced} />
      <CursorLure reduced={reduced} />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        mouseButtons={{ LEFT: MOUSE.ROTATE, RIGHT: MOUSE.ROTATE }}
        minDistance={24}
        maxDistance={70}
        minPolarAngle={0.35}
        maxPolarAngle={0.85}
      />

      <Postfx />
    </Canvas>
  );
}
