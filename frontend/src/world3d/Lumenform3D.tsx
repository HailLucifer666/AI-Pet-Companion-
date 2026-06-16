/** Lumenform3D — the companion: a cute floating screen-faced robot. A dark plated
 *  ovoid body, a rounded head with a glowing cyan SCREEN-FACE (data-driven eyes),
 *  glowing antenna tips and small stubby arms — it hovers (no legs). It reads the
 *  live FSM (worldStore.lumen) and drifts toward where it wants to be (home, the
 *  Workbench while a tool runs, a wander spot, or your cursor when you call it).
 *  Locomotion is pure (locomotion.ts); the face is pure (pet/face.ts). Stages 1–4
 *  upgrade it (more antennae + plating + glow). Reduced-motion → it hovers in place,
 *  posed by state, with the correct face. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { damp, dampAngle } from "maath/easing";
import { Color, type Group, type Mesh, type MeshStandardMaterial, type PointLight } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { arrive, placeTarget, WALK_SPEED, PathFollower, type Vec2 } from "./locomotion";
import { activeLure, lure } from "./lure";
import { stepFetch, fetchToy } from "./fetchPlay";
import { petPos } from "./petPosition";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";
import { WORLD } from "./palette";
import { emotionGlow, type EmotionVector } from "./emotion";
import { PetBubble } from "./PetBubble";
import { FaceScreen } from "./pet/FaceScreen";
import { gazeYaw, glowIntensity, shadowScale } from "./petAnim";

const LIFT = 0.72; // hover height — the robot floats above the ground
const ACCEL = 3.2; // how briskly velocity chases the desired velocity (ease in/out)
const HEAD_Y = 0.46; // head height above the body centre

const groundY = (x: number, z: number) => islandHeight(x, z, ISLAND_MAX_R);

export function Lumenform3D() {
  const reduced = useReducedMotion() ?? false;
  const stage = useWorldStore((s) => s.stage);
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);

  // Under reduced-motion the canvas renders on demand; an FSM transition (or the
  // 700ms idle tick) must queue a frame so the pet snaps to its new pose/face.
  useEffect(
    () =>
      useWorldStore.subscribe((s, p) => {
        if (s.lumen !== p.lumen) invalidate();
      }),
    [invalidate],
  );

  const baseScale = 0.95 + stage * 0.12; // grows with life stage — the companion is the subject
  const twoAntennae = stage >= 2;
  const plated = stage >= 3;
  const start = useMemo(() => placeTarget("home"), []);

  // Transform refs the locomotion + glow drive (frozen contract — petPos reads group).
  const group = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const headGroup = useRef<Group>(null); // gaze yaw — the face looks where it's called
  const antL = useRef<Group>(null);
  const antR = useRef<Group>(null);
  const tipL = useRef<Mesh>(null);
  const tipR = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const sparkleGroup = useRef<Group>(null);
  const sparkleRefs = [
    useRef<Mesh>(null),
    useRef<Mesh>(null),
    useRef<Mesh>(null),
    useRef<Mesh>(null),
    useRef<Mesh>(null),
    useRef<Mesh>(null),
  ];

  // Live planar position + smoothed velocity + facing, carried frame-to-frame.
  const pos = useRef({ x: start.x, z: start.z });
  const vel = useRef({ vx: 0, vz: 0 });
  const heading = useRef(0);

  // Emotion (derived from real agent cadence) eases frame-to-frame and colours the
  // glow: brighter when activated, warmer on a real win. Two anchored ember tones —
  // never drifts off-palette.
  const emo = useRef<EmotionVector>({ arousal: 0.3, valence: 0.5, curiosity: 0.3, confidence: 0.4 });
  const emberBase = useMemo(() => new Color(WORLD.botGlow), []);
  const emberHot = useMemo(() => new Color(WORLD.emberHi), []);

  // Road pathing: when the FSM picks a new place, plan a cobble-road route; the
  // pet walks plaza → junction → entrance instead of beelining (reduced-motion +
  // the cursor lure bypass it). Replanned only on place change (O(13) BFS).
  const pathFollower = useRef(new PathFollower());
  const lastPlace = useRef<string>("home");
  const placeChangeTime = useRef(0);

  const setTip = (m: Mesh | null, e: number) => {
    if (m) (m.material as MeshStandardMaterial).emissiveIntensity = e;
  };

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const st = useWorldStore.getState();
    const lumen = st.lumen;
    const t = state.clock.elapsedTime;
    const working = lumen.mode === "work";
    const gesture = lumen.gesture;
    const boost = glowBoost(sky.dayness);

    const lured = activeLure(lure, performance.now(), lumen.mode, reduced);

    // Fetch play: a thrown spark pulls the pet out then back. Work always wins
    // (real computation first), and reduced-motion never chases. Commit the phase
    // the pure step advances to.
    const fetchStep = !working && !reduced ? stepFetch(fetchToy, pos.current.x, pos.current.z) : null;
    if (fetchStep && fetchStep.phase !== fetchToy.phase) fetchToy.phase = fetchStep.phase;
    const fetchT = fetchStep?.target ?? null;

    let target: Vec2;
    if (fetchT) {
      target = fetchT; // fetch overrides the cursor lure + the road
    } else if (lured) {
      target = lured; // cursor lure overrides the road
    } else if (reduced) {
      target = placeTarget(lumen.place, lumen.wanderSeed); // reduced: snap to anchor, no road
    } else {
      if (lumen.place !== lastPlace.current) {
        lastPlace.current = lumen.place;
        pathFollower.current.planTo(pos.current, lumen.place);
        placeChangeTime.current = t;
      }
      const roadTarget = pathFollower.current.step(pos.current);
      target = roadTarget ?? placeTarget(lumen.place, lumen.wanderSeed); // road, else direct anchor
    }

    if (reduced) {
      const y = groundY(target.x, target.z) + LIFT;
      g.position.set(target.x, y, target.z);
      pos.current.x = target.x;
      pos.current.z = target.z;
      vel.current.vx = 0;
      vel.current.vz = 0;
      petPos.x = target.x;
      petPos.y = y;
      petPos.z = target.z;
      if (light.current) light.current.intensity = 1.6;
      if (headGroup.current) headGroup.current.rotation.y = 0;
      setTip(tipL.current, 1.2 * boost);
      setTip(tipR.current, 1.2 * boost);
      if (antL.current) antL.current.rotation.z = 0;
      if (antR.current) antR.current.rotation.z = 0;
      if (shadow.current) shadow.current.scale.setScalar(1);
      if (sparkleGroup.current) sparkleGroup.current.scale.setScalar(0);
      return;
    }

    // Anticipation gaze: pause for 600ms before walking to a new place.
    const anticipating = !lured && !fetchT && t - placeChangeTime.current < 0.6;
    
    // Drift toward the target (eased start/stop/turn), then integrate position.
    const want = anticipating ? { vx: 0, vz: 0 } : arrive(pos.current, target, WALK_SPEED);
    const a = 1 - Math.exp(-ACCEL * dt);
    vel.current.vx += (want.vx - vel.current.vx) * a;
    vel.current.vz += (want.vz - vel.current.vz) * a;
    pos.current.x += vel.current.vx * dt;
    pos.current.z += vel.current.vz * dt;

    const speed = Math.hypot(vel.current.vx, vel.current.vz);
    const moving = speed > 0.06;
    const gait = speed / WALK_SPEED;

    // Hover: a gentle float, lifted by mood (celebrate hops, nap sinks).
    let yOff: number;
    if (gesture === "celebrate") yOff = Math.abs(Math.sin(t * 9)) * 0.4;
    else if (gesture === "play") yOff = Math.abs(Math.sin(t * 7)) * 0.22;
    else if (gesture === "nap") yOff = -0.16;
    else yOff = Math.sin(t * (working ? 3.4 : 1.6)) * (working ? 0.09 : 0.06) + (moving ? Math.abs(Math.sin(t * 6)) * 0.04 * gait : 0);

    const y = groundY(pos.current.x, pos.current.z) + LIFT + yOff;
    
    // Spring physics: visual mesh organically chases the logical position
    damp(g.position, 'x', pos.current.x, 0.1, delta);
    damp(g.position, 'y', y, 0.08, delta);
    damp(g.position, 'z', pos.current.z, 0.1, delta);
    
    petPos.x = pos.current.x;
    petPos.y = y;
    petPos.z = pos.current.z;

    // Face the way it's moving (the screen leads, +Z); turn organically; bank into it.
    if (moving) heading.current = Math.atan2(vel.current.vx, vel.current.vz);
    dampAngle(g.rotation, 'y', heading.current, 0.18, delta);
    
    let d = heading.current - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const lean = Math.max(-0.16, Math.min(0.16, -d * 0.4));
    damp(g.rotation, 'z', lean, 0.15, delta);

    // Gaze: the head/face turns toward your cursor when called, else dreamily at the camera.
    // If anticipating a walk, look at the destination before moving.
    const headG = headGroup.current;
    if (headG) {
      let lookX = camera.position.x;
      let lookZ = camera.position.z;
      if (lured) {
        lookX = lured.x;
        lookZ = lured.z;
      } else if (anticipating) {
        lookX = target.x;
        lookZ = target.z;
      }
      const targetYaw = gazeYaw(lookX - pos.current.x, lookZ - pos.current.z, heading.current);
      dampAngle(headG.rotation, 'y', targetYaw, lured || anticipating ? 0.12 : 0.4, delta);
    }

    // Emotion (derived from real cadence in the store's 700ms tick) → ease the
    // vector toward it, then let it colour the glow.
    const emoTarget = st.emotion;
    damp(emo.current, 'arousal', emoTarget.arousal, 0.4, delta);
    damp(emo.current, 'valence', emoTarget.valence, 0.4, delta);
    damp(emo.current, 'curiosity', emoTarget.curiosity, 0.4, delta);
    damp(emo.current, 'confidence', emoTarget.confidence, 0.4, delta);
    const { lightMul, warmth } = emotionGlow(emo.current);

    // Glow: the point light on its state ceiling, scaled by arousal + warmed by mood;
    // antenna tips pulse (cyan/ember bloom).
    const lightTarget = glowIntensity(t, gesture, working, moving) * lightMul;
    if (light.current) {
      damp(light.current, 'intensity', lightTarget, 0.12, delta);
      light.current.color.copy(emberBase).lerp(emberHot, warmth);
    }
    let tipE: number;
    if (gesture === "nap") tipE = 0.4;
    else if (working) tipE = 1.3 + Math.sin(t * 6) * 0.5;
    else if (gesture === "celebrate") tipE = 1.6 + Math.sin(t * 8) * 0.4;
    else tipE = 1.1 + Math.sin(t * 3) * 0.4;
    tipE *= 0.9 + emo.current.arousal * 0.3; // tips burn a touch hotter when activated
    setTip(tipL.current, tipE * boost);
    setTip(tipR.current, tipE * boost);

    // Antennae sway (a touch of life); droop a little when napping.
    const sway = gesture === "nap" ? 0.0 : 0.12;
    if (antL.current) antL.current.rotation.z = Math.sin(t * 1.6) * sway + (gesture === "nap" ? 0.5 : 0);
    if (antR.current) antR.current.rotation.z = Math.sin(t * 1.6 + 1.2) * sway - (gesture === "nap" ? 0.5 : 0);

    // Shadow: a contact blob that shrinks as it floats higher.
    if (shadow.current) shadow.current.scale.setScalar(shadowScale(yOff));

    // Celebrate sparkles: always mounted, faded in by group scale (never unmount).
    const sg = sparkleGroup.current;
    if (sg) {
      const targetS = gesture === "celebrate" ? 1 : 0;
      damp(sg.scale, 'x', targetS, 0.15, delta);
      damp(sg.scale, 'y', targetS, 0.15, delta);
      damp(sg.scale, 'z', targetS, 0.15, delta);
      
      const s = sg.scale.x;
      if (s > 0.01) {
        for (let i = 0; i < 6; i++) {
          const sp = sparkleRefs[i].current;
          if (sp) {
            const ang = (i / 6) * Math.PI * 2 + t * 2.5;
            sp.position.set(Math.cos(ang) * 0.55, 0.2 + Math.sin(t * 3 + i) * 0.2, Math.sin(ang) * 0.55);
          }
        }
      }
    }
  });

  return (
    <group ref={group} position={[start.x, groundY(start.x, start.z) + LIFT, start.z]} scale={baseScale}>
      {/* contact shadow — grounds the float */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, -(LIFT - 0.02), 0]} renderOrder={-1}>
        <circleGeometry args={[0.3, 16]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.28} depthWrite={false} />
      </mesh>

      {/* the warm point light inside the body — tight so Bloom hits the bot, not a halo */}
      <pointLight ref={light} color={WORLD.botGlow} intensity={1.5} distance={4.5} decay={2.5} position={[0, 0.2, 0]} />

      {/* ── body: a floating dark plated ovoid ── */}
      <mesh castShadow receiveShadow scale={[1, 0.82, 0.92]}>
        <sphereGeometry args={[0.34, 24, 18]} />
        <meshStandardMaterial color={WORLD.botBody} roughness={0.45} metalness={0.4} flatShading={false} />
      </mesh>

      {/* a thin glowing seam around the belly — a little life on the dark shell */}
      <mesh rotation-x={Math.PI / 2} position={[0, -0.02, 0]}>
        <torusGeometry args={[0.3, 0.012, 8, 32]} />
        <meshStandardMaterial color={WORLD.botEye} emissive={WORLD.botEye} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>

      {/* shoulder plate at higher stages */}
      {plated && (
        <mesh position={[0, 0.12, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.33, 0.04, 8, 24]} />
          <meshStandardMaterial color={WORLD.botPlate} roughness={0.4} metalness={0.5} />
        </mesh>
      )}

      {/* ── stubby arms ── */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.33, -0.02, 0.02]} rotation-z={sx * -0.5} castShadow>
          <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
          <meshStandardMaterial color={WORLD.botBody} roughness={0.5} metalness={0.35} />
        </mesh>
      ))}

      {/* ── head: rounded dark shell + the glowing screen-face (looks where called) ── */}
      <group ref={headGroup} position={[0, HEAD_Y, 0.04]}>
        <mesh castShadow>
          <sphereGeometry args={[0.25, 24, 18]} />
          <meshStandardMaterial color={WORLD.botBody} roughness={0.4} metalness={0.45} />
        </mesh>
        {/* the screen-face on the front (+Z) */}
        <FaceScreen width={0.34} />

        {/* ── antennae: 1 from hatch, 2 from the Juvenile stage; glowing tips ── */}
        <group ref={antL} position={[-0.1, 0.22, 0]}>
          <mesh position={[0, 0.11, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
            <meshStandardMaterial color={WORLD.botPlate} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh ref={tipL} position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color={WORLD.botGlow} emissive={WORLD.botGlow} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
        {twoAntennae && (
          <group ref={antR} position={[0.1, 0.22, 0]}>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
              <meshStandardMaterial color={WORLD.botPlate} roughness={0.5} metalness={0.5} />
            </mesh>
            <mesh ref={tipR} position={[0, 0.24, 0]}>
              <sphereGeometry args={[0.045, 10, 10]} />
              <meshStandardMaterial color={WORLD.botGlow} emissive={WORLD.botGlow} emissiveIntensity={1.2} toneMapped={false} />
            </mesh>
          </group>
        )}
      </group>

      {/* ── celebrate sparkles: always mounted, faded in by scale on celebrate ── */}
      <group ref={sparkleGroup} scale={0}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} ref={sparkleRefs[i]}>
            <icosahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* emoji/speech bubble above the head — shows what it's doing / says replies */}
      <PetBubble />
    </group>
  );
}
