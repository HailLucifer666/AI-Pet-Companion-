/** World3D — the 3D Grove's canvas: sky + fog, a warm sun casting soft shadows,
 *  and a camera that *follows the companion* as it roams. Left-drag slides the
 *  world like a map, right-drag rotates, scroll eases the zoom — and once you let
 *  go, the camera holds your framing briefly then glides back to the pet on its
 *  own. When idle it drifts in a slow cinematic orbit. Reduced-motion snaps and
 *  renders on demand. The whole three.js stack is lazy-loaded with the Den. */

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
import { petPos } from "./petPosition";
import { useWorldStore } from "../state/worldStore";

interface ControlsLike {
  target: Vector3;
  update: () => void;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const FOLLOW_RATE = 7; // how briskly the pivot chases the pet (per second) — tight
const ZOOM_RATE = 5; // how briskly the camera glides to its target distance
const LEAD = 0.25; // seconds of look-ahead — the camera anticipates travel
const MAX_LEAD = 1.6; // cap the look-ahead offset (world units)
const IDLE_AFTER = 6; // seconds of no input + settled pet before the camera drifts
const IDLE_DRIFT = 0.05; // rad/sec — a slow cinematic orbit
const MANUAL_HOLD = 2; // seconds a drag/zoom is respected before follow re-locks
const AUTO_RATE = 0.6; // how slowly the camera re-takes its own distance
const MIN_D = 8;
const MAX_D = 26;
const WHEEL_SENS = 0.0012; // wheel delta → fractional distance change

// Distance the camera prefers for what the pet is doing: in close while it works,
// back to take in the roam, mid at rest. Eased toward, never snapped.
function autoDistance(working: boolean, moving: boolean): number {
  if (working) return 11;
  if (moving) return 20;
  return 15;
}

const clampD = (d: number) => Math.max(MIN_D, Math.min(MAX_D, d));

/** A fluid drone-follow rig. It pans camera + pivot together so the pet stays
 *  framed at the angle/zoom you chose; eases the zoom itself (OrbitControls dollies
 *  in hard steps, so we own zoom here); leans slightly toward where the pet is
 *  heading; and, once you stop touching it, takes its own distance to suit the
 *  pet's activity and drifts in a slow cinematic orbit. Reduced-motion → snap. */
function CameraRig({ reduced }: { reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const followed = useRef(new Vector3());
  const want = useRef(new Vector3());
  const vel = useRef(new Vector3());
  const lastPetXZ = useRef(new Vector3());
  const offset = useRef(new Vector3());
  const targetDist = useRef(19);
  const manualUntil = useRef(0);
  const lastInput = useRef(0);
  const elapsed = useRef(0);
  const inited = useRef(false);
  const interacting = useRef(false); // user is dragging (pan or rotate) right now
  const panHoldUntil = useRef(0); // after a drag, hold their framing before re-following

  // Own the wheel: ease zoom instead of OrbitControls' hard dolly steps.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDist.current = clampD(targetDist.current * (1 + e.deltaY * WHEEL_SENS));
      manualUntil.current = elapsed.current + MANUAL_HOLD;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  // Drag (pan or rotate) releases the follow so it never fights the user; on
  // release we hold their framing, then the follow eases back to the pet.
  useEffect(() => {
    if (!controls) return;
    const onStart = () => {
      interacting.current = true;
      lastInput.current = elapsed.current;
    };
    const onEnd = () => {
      interacting.current = false;
      panHoldUntil.current = elapsed.current + MANUAL_HOLD;
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

    // Pet velocity (smoothed) from ground-plane deltas → look-ahead + moving flag.
    const px = petPos.x;
    const pz = petPos.z;
    const moved = Math.hypot(px - lastPetXZ.current.x, pz - lastPetXZ.current.z);
    if (dt > 0) {
      const vk = reduced ? 1 : 1 - Math.exp(-5 * dt);
      vel.current.x += ((px - lastPetXZ.current.x) / dt - vel.current.x) * vk;
      vel.current.z += ((pz - lastPetXZ.current.z) / dt - vel.current.z) * vk;
    }
    lastPetXZ.current.set(px, 0, pz);

    let leadX = reduced ? 0 : vel.current.x * LEAD;
    let leadZ = reduced ? 0 : vel.current.z * LEAD;
    const leadLen = Math.hypot(leadX, leadZ);
    if (leadLen > MAX_LEAD) {
      leadX = (leadX / leadLen) * MAX_LEAD;
      leadZ = (leadZ / leadLen) * MAX_LEAD;
    }
    want.current.set(px + leadX, petPos.y + 0.6, pz + leadZ);

    if (!inited.current) {
      followed.current.copy(want.current);
      controls.target.copy(want.current);
      inited.current = true;
    }

    // Follow only when the user isn't dragging and the post-drag hold has passed —
    // otherwise they own the view (left-drag pans / right-drag rotates the target).
    const following = !interacting.current && t > panHoldUntil.current;
    if (following) {
      const k = reduced ? 1 : 1 - Math.exp(-FOLLOW_RATE * dt);
      followed.current.lerp(want.current, k);
      // Pan camera + target by the same delta → framing holds at your angle/zoom.
      const dx = followed.current.x - controls.target.x;
      const dy = followed.current.y - controls.target.y;
      const dz = followed.current.z - controls.target.z;
      controls.target.x += dx;
      controls.target.y += dy;
      controls.target.z += dz;
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
    } else {
      // User dragged the view — keep the follow point where they left it so the
      // eventual re-follow glides from here instead of snapping.
      followed.current.copy(controls.target);
    }

    // Autonomous distance — only while following, once the manual zoom's moment passed.
    const working = useWorldStore.getState().lumen.mode === "work";
    const moving = moved > 0.01;
    if (following && t > manualUntil.current) {
      const auto = autoDistance(working, moving);
      const ak = reduced ? 1 : 1 - Math.exp(-AUTO_RATE * dt);
      targetDist.current += (auto - targetDist.current) * ak;
    }

    // Ease the camera's distance toward the target (the buttery zoom).
    offset.current.copy(camera.position).sub(controls.target);
    const curDist = offset.current.length() || 1;
    const zk = reduced ? 1 : 1 - Math.exp(-ZOOM_RATE * dt);
    const newDist = curDist + (clampD(targetDist.current) - curDist) * zk;
    offset.current.setLength(newDist);

    // Idle cinematic orbit: following + settled pet + hands off → drift slowly.
    if (following && !reduced && moved < 0.005 && t - lastInput.current > IDLE_AFTER) {
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
      camera={{ position: [12, 10, 12], fov: 42, near: 0.1, far: 140 }}
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
        enableDamping
        dampingFactor={0.06}
        screenSpacePanning={false}
        panSpeed={1}
        mouseButtons={{ LEFT: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
        minDistance={8}
        maxDistance={26}
        minPolarAngle={0.6}
        maxPolarAngle={1.15}
      />

      <Postfx />
    </Canvas>
  );
}
