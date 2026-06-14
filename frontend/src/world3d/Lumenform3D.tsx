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
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { arrive, placeTarget, WALK_SPEED } from "./locomotion";
import { activeLure, lure } from "./lure";
import { petPos } from "./petPosition";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";
import { WORLD } from "./palette";
import { PetBubble } from "./PetBubble";
import { FaceScreen } from "./pet/FaceScreen";
import { gazeYaw, glowIntensity, shadowScale } from "./petAnim";

const LIFT = 0.72; // hover height — the robot floats above the ground
const ACCEL = 3.2; // how briskly velocity chases the desired velocity (ease in/out)
const TURN = 4; // how briskly it rotates to face travel
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

  const setTip = (m: Mesh | null, e: number) => {
    if (m) (m.material as MeshStandardMaterial).emissiveIntensity = e;
  };

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const { lumen } = useWorldStore.getState();
    const t = state.clock.elapsedTime;
    const working = lumen.mode === "work";
    const gesture = lumen.gesture;
    const boost = glowBoost(sky.dayness);

    const lured = activeLure(lure, performance.now(), lumen.mode, reduced);
    const target = lured ?? placeTarget(lumen.place, lumen.wanderSeed);

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

    // Drift toward the target (eased start/stop/turn), then integrate position.
    const want = arrive(pos.current, target, WALK_SPEED);
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
    g.position.set(pos.current.x, y, pos.current.z);
    petPos.x = pos.current.x;
    petPos.y = y;
    petPos.z = pos.current.z;

    // Face the way it's moving (the screen leads, +Z); turn gradually; bank into it.
    if (moving) heading.current = Math.atan2(vel.current.vx, vel.current.vz);
    let d = heading.current - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, TURN * dt);
    const lean = Math.max(-0.16, Math.min(0.16, -d * 0.4));
    g.rotation.z += (lean - g.rotation.z) * Math.min(1, 8 * dt);

    // Gaze: the head/face turns toward your cursor when called, else dreamily at the camera.
    const headG = headGroup.current;
    if (headG) {
      const lookX = lured ? lured.x : camera.position.x;
      const lookZ = lured ? lured.z : camera.position.z;
      const targetYaw = gazeYaw(lookX - pos.current.x, lookZ - pos.current.z, heading.current);
      const yawSpeed = lured ? 4.5 : 1.8;
      headG.rotation.y += (targetYaw - headG.rotation.y) * Math.min(1, yawSpeed * dt);
    }

    // Glow: the point light on its state ceiling; antenna tips pulse (cyan/ember bloom).
    const glowK = 1 - Math.exp(-5 * dt);
    const lightTarget = glowIntensity(t, gesture, working, moving);
    if (light.current) light.current.intensity += (lightTarget - light.current.intensity) * glowK;
    let tipE: number;
    if (gesture === "nap") tipE = 0.4;
    else if (working) tipE = 1.3 + Math.sin(t * 6) * 0.5;
    else if (gesture === "celebrate") tipE = 1.6 + Math.sin(t * 8) * 0.4;
    else tipE = 1.1 + Math.sin(t * 3) * 0.4;
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
      const k = targetS > sg.scale.x ? 6 : 9;
      const s = sg.scale.x + (targetS - sg.scale.x) * Math.min(1, k * dt);
      sg.scale.setScalar(s);
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
