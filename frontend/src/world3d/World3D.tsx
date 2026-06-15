/** World3D â€” the 3D Grove's canvas: sky + fog, a warm sun casting soft shadows,
 *  and a high-diorama camera that *frames the whole island* from a steep 3/4
 *  angle. The companion roams within the frame (so it's always visible) rather
 *  than being chased. Drag orbits around the island, scroll eases the zoom, and
 *  once you let go it drifts in a slow cinematic orbit. Reduced-motion holds a
 *  still framed shot. The whole three.js stack is lazy-loaded with the Den. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { ACESFilmicToneMapping, MOUSE, Vector3 } from "three";
import { Island } from "./Island";
import { Village3D } from "./Village3D";
import { GlowMushrooms3D } from "./GlowMushrooms3D";
import { Lumenform3D } from "./Lumenform3D";
import { Crystals3D } from "./Crystals3D";
import { Places3D } from "./Places3D";
import { SporeGate3D } from "./SporeGate3D";
import { Pulses3D } from "./Pulses3D";
import { Particles3D } from "./Particles3D";
import { Postfx } from "./Postfx";
import { Atmosphere } from "./Atmosphere";
import { Sky3D } from "./Sky3D";
import { Clouds3D } from "./Clouds3D";
import { Rain3D } from "./Rain3D";
import { CursorLure } from "./CursorLure";
import { FetchToy3D } from "./FetchToy3D";
import { useWeather } from "./useWeather";
import { fxFor } from "./weather";
import { localHour } from "./daylight";
import { petPos } from "./petPosition";
import { cameraFocus } from "./cameraFocus";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { qualityFlags } from "./quality";
import { QualityManager, useQualityStore } from "./hooks/useQualityLadder";
import { stageReveal } from "./widening";
import { useWorldStore } from "../state/worldStore";
import { useSkills } from "./useSkills";

interface ControlsLike {
  target: Vector3;
  update: () => void;
  addEventListener: (type: string, cb: () => void) => void;
  removeEventListener: (type: string, cb: () => void) => void;
}

const ZOOM_RATE = 5; // how briskly the camera glides to its target distance
const IDLE_AFTER = 6; // seconds hands-off before the camera drifts in a slow orbit
const IDLE_DRIFT = 0.04; // rad/sec â€” a slow cinematic orbit around the pet
const MIN_D = 6; // closest zoom â€” a close-up of the companion ("see my pet")
const MAX_D = 150; // absolute ceiling (= stage-4 survey range); the per-stage cap (The Widening) is enforced in the rig
const DEFAULT_DIST = 22; // resting distance â€” close to the pet, the world spilling off-screen
const WHEEL_SENS = 0.0012; // wheel delta â†’ fractional distance change
const FOLLOW_K = 4.5; // follow ease rate (frame-rate-independent) â€” tight, never sloppy
const PAN_HOLD = 2.5; // seconds after a drag before the camera re-acquires the pet
const CAM_CLEAR = 2.5; // keep the camera this far above the terrain (no clipping through hills)

const clampD = (d: number) => Math.max(MIN_D, Math.min(MAX_D, d));

/** An explorable follow-rig for the big world. It keeps the companion framed by
 *  panning the orbit toward it â€” moving controls.target AND the camera by the SAME
 *  delta, so the user's orbit angle + zoom are preserved exactly (the fix for the
 *  old "chase" jitter, where moving only the target made OrbitControls recompute the
 *  orbit every frame). Left-drag strolls the world, right-drag orbits, scroll eases
 *  the zoom; after a drag the camera holds your framing, then glides back to the pet.
 *  Camera-terrain clearance stops it clipping through hills at close zoom. Reduced-
 *  motion â†’ snap-follow, no eased zoom or drift. */
function CameraRig({ reduced, maxDist }: { reduced: boolean; maxDist: number }) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as ControlsLike | null;

  const offset = useRef(new Vector3());
  const followed = useRef(new Vector3(petPos.x, petPos.y + 0.3, petPos.z));
  const targetDist = useRef(DEFAULT_DIST);
  const lastInput = useRef(0);
  const elapsed = useRef(0);
  const interacting = useRef(false); // user is dragging (pan/orbit) right now
  const panHoldUntil = useRef(0); // hold the follow until this time after a drag

  // Own the wheel: ease zoom instead of OrbitControls' hard dolly steps. Zoom stays
  // centred on the pet (it does NOT release the follow â€” only dragging does).
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

  // Track drag start/end: pause the follow during a drag, then hold the user's framing
  // for PAN_HOLD seconds before re-acquiring the pet.
  useEffect(() => {
    if (!controls) return;
    const mark = () => {
      lastInput.current = elapsed.current;
      panHoldUntil.current = elapsed.current + PAN_HOLD;
    };
    const onStart = () => {
      interacting.current = true;
      mark();
    };
    const onEnd = () => {
      interacting.current = false;
      mark();
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

    // "See my pet" / survey button asks for a distance â€” adopt it + re-acquire the pet.
    if (cameraFocus.request > 0) {
      targetDist.current = clampD(cameraFocus.request);
      cameraFocus.request = 0;
      lastInput.current = t;
      panHoldUntil.current = 0;
    }

    // The current orbit offset (captured BEFORE we move the target, so the angle +
    // distance are preserved when we re-place the camera at target + offset below).
    offset.current.copy(camera.position).sub(controls.target);

    // Follow: ease a smoothed point toward the pet and pan the target onto it. Paused
    // while dragging / within the post-drag hold (the user owns the framing then).
    const followActive = !interacting.current && t > panHoldUntil.current;
    if (followActive) {
      const pk = reduced ? 1 : 1 - Math.exp(-FOLLOW_K * dt);
      followed.current.x += (petPos.x - followed.current.x) * pk;
      followed.current.y += (petPos.y + 0.3 - followed.current.y) * pk;
      followed.current.z += (petPos.z - followed.current.z) * pk;
      controls.target.set(followed.current.x, followed.current.y, followed.current.z);
    } else {
      followed.current.copy(controls.target); // stay synced so follow resumes without a jump
    }

    // Ease the camera's distance toward the wheel-set target (the buttery zoom),
    // capped to the current stage's survey range â€” The Widening opens it as the pet grows.
    const cap = Math.min(MAX_D, maxDist);
    if (targetDist.current > cap) targetDist.current = cap;
    const curDist = offset.current.length() || 1;
    const zk = reduced ? 1 : 1 - Math.exp(-ZOOM_RATE * dt);
    offset.current.setLength(curDist + (Math.max(MIN_D, Math.min(cap, targetDist.current)) - curDist) * zk);

    // Idle cinematic orbit: hands off long enough â†’ drift slowly around the pet.
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

    // Camera-terrain clearance: never let the camera dip below (or into) a hill.
    const ground = islandHeight(camera.position.x, camera.position.z, ISLAND_MAX_R);
    if (camera.position.y < ground + CAM_CLEAR) camera.position.y = ground + CAM_CLEAR;

    controls.update();
  });

  return null;
}

export function World3D() {
  const reduced = useReducedMotion() ?? false;
  const weather = useWeather();
  const fx = fxFor(weather);
  // Approved skills â†’ earned village monuments. Read OUTSIDE the Canvas (like
  // weather) since react-query context doesn't cross the r3f renderer boundary.
  const skills = useSkills();

  // Detect the GPU tier dynamically â†’ a flag set that drops the GPU-heavy flourishes
  // (bloom, MSAA, shadows, extra lights, dpr) first on weak hardware so fps holds.
  const tier = useQualityStore((s) => s.tier);
  const q = useMemo(() => qualityFlags(tier), [tier]);

  // The Widening: the world opens as the companion matures (real pet.stage). Each
  // stage widens the survey range + pushes the horizon fog back.
  const stage = useWorldStore((s) => s.stage);
  const reveal = stageReveal(stage);

  // The sky tracks the real local clock; re-read each minute.
  const [hour, setHour] = useState(() => localHour(new Date()));
  useEffect(() => {
    const id = setInterval(() => setHour(localHour(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  const setWeather = useWorldStore((s) => s.setWeather);
  useEffect(() => {
    if (weather.category) {
      setWeather(weather.category);
    }
  }, [weather.category, setWeather]);

  // Pause-on-blur: drop frameloop to demand when the tab is hidden to save power.
  const [blurred, setBlurred] = useState(false);
  useEffect(() => {
    const onVis = () => setBlurred(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      shadows={q.shadows}
      dpr={q.dpr}
      frameloop={(reduced || blurred) ? "demand" : "always"}
      camera={{ position: [0, 20, 24], fov: 42, near: 0.1, far: 400 }}
      gl={{ antialias: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      <QualityManager />
      {/* Sky, light + fog â€” driven by real time of day Ã— real weather. */}
      <Atmosphere hour={hour} fx={fx} reduced={reduced} shadows={q.shadows} shadowMapSize={q.shadowMapSize} fogFar={reveal.fogFar} />

      {/* The sun + moon disc, riding the same day/night light arc. */}
      <Sky3D hour={hour} reduced={reduced} />

      {/* Deep-sky stars â€” faint by day (the bright sky + fog swallow them), a real
          field at night. `fade` blends them into the horizon fog. */}
      <Stars radius={250} depth={60} count={q.stars} factor={4} saturation={0.2} fade speed={reduced ? 0 : 0.4} />

      <Island />
      <Village3D reduced={reduced} skills={skills} />
      <GlowMushrooms3D reduced={reduced} lit={q.litMushrooms} />
      <Lumenform3D />
      <FetchToy3D reduced={reduced} />
      <Crystals3D />
      <Places3D />
      <SporeGate3D />
      <Pulses3D />
      <Particles3D />
      <Clouds3D amount={fx.clouds} reduced={reduced} />
      <Rain3D rain={fx.rain} lightning={fx.lightning} reduced={reduced} />

      <CameraRig reduced={reduced} maxDist={reveal.surveyDist} />
      <CursorLure reduced={reduced} />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan
        screenSpacePanning={false}
        enableDamping
        dampingFactor={0.06}
        mouseButtons={{ LEFT: MOUSE.PAN, RIGHT: MOUSE.ROTATE }}
        minDistance={MIN_D}
        maxDistance={MAX_D}
        minPolarAngle={0.3}
        maxPolarAngle={1.2}
      />

      <Postfx bloom={!reduced && q.bloom} msaa={q.msaa} />
    </Canvas>
  );
}
