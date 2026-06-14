/** Lumenform3D — the companion, living on the island. A small low-poly grove-sprite
 *  that *is* a light: a glowing emissive heart inside a chunky faceted body, with a
 *  head that looks where it's called, eyes that blink, ears that flick, a tail that
 *  lags its turns, and legs that step. It reads the live FSM (worldStore.lumen) and
 *  walks toward where it wants to be (home, the Workbench while a tool runs, a wander
 *  spot, or your cursor when you call it). Locomotion is pure (locomotion.ts); the
 *  character/idle layer is pure (petAnim.ts) — this file is the thin renderer that
 *  drives the meshes. Reduced-motion → it sits, posed by state, perfectly still.
 */

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
import {
  blinkLidTarget,
  breathScale,
  earFlickDelta,
  gazePitch,
  gazeYaw,
  glowIntensity,
  headNodY,
  legLift,
  nextBlinkInterval,
  shadowScale,
  tailWag,
  workRingDelta,
} from "./petAnim";

const LIFT = 0.55; // raise the body so it sits on the ground, not in it
const ACCEL = 3.2; // how briskly velocity chases the desired velocity (ease in/out)
const TURN = 4; // how briskly it rotates to face travel
const HEAD_Y = 0.38; // base head height (gaze nod is added on top)

const groundY = (x: number, z: number) => islandHeight(x, z, ISLAND_MAX_R);

export function Lumenform3D() {
  const reduced = useReducedMotion() ?? false;
  const stage = useWorldStore((s) => s.stage);
  const showRing = useWorldStore((s) => s.lumen.mode === "work"); // mounts the work ring
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);

  // Under reduced-motion the canvas renders on demand; an FSM transition (or the
  // 700ms idle tick) must queue a frame so the pet snaps to its new pose.
  useEffect(
    () =>
      useWorldStore.subscribe((s, p) => {
        if (s.lumen !== p.lumen) invalidate();
      }),
    [invalidate],
  );

  const baseScale = 0.95 + stage * 0.12; // grows with life stage — the companion is the subject
  const start = useMemo(() => placeTarget("home"), []);

  // Transform refs the locomotion + glow drive (frozen contract — petPos reads group).
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  // Character refs (additive — the idle layer mutates these children only).
  const headGroup = useRef<Group>(null);
  const headPitch = useRef<Group>(null);
  const tailGroup = useRef<Group>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const lidL = useRef<Mesh>(null);
  const lidR = useRef<Mesh>(null);
  const earL = useRef<Mesh>(null);
  const earR = useRef<Mesh>(null);
  const legRefs = [useRef<Mesh>(null), useRef<Mesh>(null), useRef<Mesh>(null), useRef<Mesh>(null)];
  const shadow = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
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

  // Idle-animation state (refs → persist across frames, never trigger a render).
  const lidY = useRef(0);
  const blinkAccum = useRef(0);
  const blinkInterval = useRef(nextBlinkInterval(Math.random));
  const earFlickNext = useRef(2 + Math.random() * 5);
  const earFlickStart = useRef(-1);
  const earFlickSide = useRef<"L" | "R" | "none">("none");
  const eyeSacc = useRef({ x: 0, y: 0 });
  const eyeSaccNext = useRef(1.5 + Math.random() * 3.5);
  const tailLag = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05); // clamp long frames so a stall can't teleport it
    const { lumen } = useWorldStore.getState();
    const t = state.clock.elapsedTime;
    // Answer the user's cursor-call while at rest; otherwise follow the FSM's intent.
    const lured = activeLure(lure, performance.now(), lumen.mode, reduced);
    const target = lured ?? placeTarget(lumen.place, lumen.wanderSeed);

    if (reduced) {
      // Static-but-alive: snap to where the state says, pose by gesture, no motion.
      const y = groundY(target.x, target.z) + LIFT;
      g.position.set(target.x, y, target.z);
      pos.current.x = target.x;
      pos.current.z = target.z;
      vel.current.vx = 0;
      vel.current.vz = 0;
      petPos.x = target.x;
      petPos.y = y;
      petPos.z = target.z;
      const napping = lumen.gesture === "nap";
      if (light.current) light.current.intensity = 1.6;
      if (mat.current) mat.current.emissiveIntensity = 0.85 * glowBoost(sky.dayness);
      if (body.current) body.current.scale.set(1, 1, 1);
      if (headGroup.current) {
        headGroup.current.rotation.y = 0;
        headGroup.current.position.y = HEAD_Y;
      }
      if (headPitch.current) headPitch.current.rotation.x = napping ? 0.6 : 0;
      const napLid = napping ? 0.88 : 0;
      if (lidL.current) lidL.current.scale.y = napLid;
      if (lidR.current) lidR.current.scale.y = napLid;
      if (tailGroup.current) tailGroup.current.rotation.set(0, 0, 0);
      for (const leg of legRefs) if (leg.current) leg.current.position.y = -0.34;
      if (earL.current) earL.current.rotation.z = 0.32;
      if (earR.current) earR.current.rotation.z = -0.32;
      if (shadow.current) shadow.current.scale.setScalar(1);
      if (sparkleGroup.current) sparkleGroup.current.scale.setScalar(0);
      return;
    }

    // Chase the desired velocity (frame-rate-independent smoothing) → eased
    // starts, stops, and turns. Then integrate position.
    const want = arrive(pos.current, target, WALK_SPEED);
    const a = 1 - Math.exp(-ACCEL * dt);
    vel.current.vx += (want.vx - vel.current.vx) * a;
    vel.current.vz += (want.vz - vel.current.vz) * a;
    pos.current.x += vel.current.vx * dt;
    pos.current.z += vel.current.vz * dt;

    const speed = Math.hypot(vel.current.vx, vel.current.vz);
    const moving = speed > 0.06;
    const gait = speed / WALK_SPEED; // 0..1, scales the walk's bounce
    const working = lumen.mode === "work";
    const gesture = lumen.gesture;

    // Vertical pose: a bounce that grows with pace while moving, else a gesture/idle bob.
    let yOff: number;
    if (moving) yOff = Math.abs(Math.sin(t * 7)) * 0.09 * gait;
    else if (gesture === "celebrate") yOff = Math.abs(Math.sin(t * 9)) * 0.45;
    else if (gesture === "play") yOff = Math.abs(Math.sin(t * 7)) * 0.22;
    else if (gesture === "nap") yOff = -0.25;
    else yOff = Math.sin(t * (working ? 5 : 2.2)) * (working ? 0.1 : 0.06);

    const y = groundY(pos.current.x, pos.current.z) + LIFT + yOff;
    g.position.set(pos.current.x, y, pos.current.z);
    petPos.x = pos.current.x;
    petPos.y = y;
    petPos.z = pos.current.z;

    // Face the way it's moving; turn gradually (shortest-arc). Lean into the turn.
    if (moving) heading.current = Math.atan2(vel.current.vx, vel.current.vz);
    let d = heading.current - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * Math.min(1, TURN * dt);
    const lean = Math.max(-0.2, Math.min(0.2, -d * 0.5)); // bank toward the turn, capped
    g.rotation.z += (lean - g.rotation.z) * Math.min(1, 8 * dt);

    // ── GAZE: head looks where it's called (your cursor) else dreamily at the camera.
    //    Runs after heading is final (gazeYaw is heading-relative). ──
    const headG = headGroup.current;
    const headP = headPitch.current;
    const lookX = lured ? lured.x : camera.position.x;
    const lookZ = lured ? lured.z : camera.position.z;
    const lookY = lured ? groundY(lured.x, lured.z) + LIFT + 0.4 : camera.position.y;
    const dxg = lookX - pos.current.x;
    const dzg = lookZ - pos.current.z;
    if (headG) {
      const targetYaw = gazeYaw(dxg, dzg, heading.current);
      const yawSpeed = lured ? 4.5 : 1.8;
      headG.rotation.y += (targetYaw - headG.rotation.y) * Math.min(1, yawSpeed * dt);
      headG.position.y = HEAD_Y + headNodY(t, working, gesture);
    }
    if (headP) {
      const targetPitch = gazePitch(lookY - (y + HEAD_Y), Math.hypot(dxg, dzg), gesture);
      const pitchSpeed = gesture === "nap" ? 1.2 : 3.5;
      headP.rotation.x += (targetPitch - headP.rotation.x) * Math.min(1, pitchSpeed * dt);
    }

    // ── BLINK: eyelids sweep shut in a short window; nap is heavy-lidded. ──
    blinkAccum.current += dt;
    let lidTarget = blinkLidTarget(blinkAccum.current, blinkInterval.current);
    if (gesture === "nap") lidTarget = 0.88;
    else if (blinkAccum.current >= blinkInterval.current) {
      blinkAccum.current = 0;
      blinkInterval.current = nextBlinkInterval(Math.random);
    }
    lidY.current += (lidTarget - lidY.current) * Math.min(1, 22 * dt);
    if (lidL.current) lidL.current.scale.y = lidY.current;
    if (lidR.current) lidR.current.scale.y = lidY.current;

    // ── EYE saccade: small darts that decay, so the eyes never sit dead. ──
    if (t >= eyeSaccNext.current) {
      const amp = gesture === "gaze" ? 2 : 1;
      eyeSacc.current.x = (Math.random() - 0.5) * 0.018 * amp;
      eyeSacc.current.y = (Math.random() - 0.5) * 0.01 * amp;
      eyeSaccNext.current = t + 1.5 + Math.random() * 3.5;
    }
    const sd = Math.min(1, 8 * dt);
    eyeSacc.current.x += (0 - eyeSacc.current.x) * sd;
    eyeSacc.current.y += (0 - eyeSacc.current.y) * sd;
    if (eyeL.current) eyeL.current.position.set(-0.1 + eyeSacc.current.x, 0.02 + eyeSacc.current.y, 0.2);
    if (eyeR.current) eyeR.current.position.set(0.1 + eyeSacc.current.x, 0.02 + eyeSacc.current.y, 0.2);

    // ── EAR flick: one ear twitches now and then (from the Juvenile stage). ──
    if (stage >= 2 && earL.current && earR.current) {
      if (t >= earFlickNext.current) {
        earFlickSide.current = Math.random() < 0.5 ? "L" : "R";
        earFlickStart.current = t;
        earFlickNext.current = t + 2 + Math.random() * 5;
      }
      const [dL, dR] = earFlickDelta(t, earFlickStart.current, earFlickSide.current);
      earL.current.rotation.z = 0.32 + dL;
      earR.current.rotation.z = -0.32 + dR;
    }

    // ── TAIL: a wag by mood + a lagged trail of the turn-lean (follow-through). ──
    const tg = tailGroup.current;
    if (tg) {
      tg.rotation.x = tailWag(t, moving, gait, gesture);
      tailLag.current += (g.rotation.z * 1.8 - tailLag.current) * Math.min(1, 6 * dt);
      tg.rotation.z = tailLag.current;
    }

    // ── LEGS: diagonal walk cycle while moving, micro weight-shift at rest. ──
    for (let i = 0; i < 4; i++) {
      const leg = legRefs[i].current;
      if (leg) leg.position.y = -0.34 + legLift(t, gait, moving, i);
    }

    // ── BREATH: volume-preserving squash/stretch on the glowing core. ──
    if (body.current) {
      const bs = breathScale(t, gesture, working);
      const xz = 1 / Math.sqrt(bs);
      body.current.scale.set(xz, bs, xz);
    }

    // ── GLOW: the light on its state ceiling; the core pulses on a freq ≠ breath. ──
    const glowK = reduced ? 1 : 1 - Math.exp(-5 * dt); // ≈0.08 at 60fps, but frame-rate-independent
    const lightTarget = glowIntensity(t, gesture, working, moving);
    if (light.current) light.current.intensity += (lightTarget - light.current.intensity) * glowK;
    if (mat.current) {
      const boost = glowBoost(sky.dayness); // blazes at night, eases off by day
      let core: number;
      if (gesture === "nap") core = 0.45;
      else if (gesture === "celebrate") core = 1.2 + Math.sin(t * 6) * 0.25;
      else if (working) core = 1.2 + Math.sin(t * 4) * 0.2; // centred pulse — blazes AND eases
      else core = 0.9 + Math.sin(t * 2.2) * 0.1;
      mat.current.emissiveIntensity += (core * boost - mat.current.emissiveIntensity) * glowK;
    }

    // ── SHADOW: a contact blob that shrinks as it hops (grounds the bounce). ──
    if (shadow.current) shadow.current.scale.setScalar(shadowScale(yOff));

    // ── WORK RING: spins + pulses while a tool runs. ──
    if (ringRef.current && working) {
      ringRef.current.rotation.y += workRingDelta(dt);
      (ringRef.current.material as MeshStandardMaterial).emissiveIntensity = 0.6 + Math.sin(t * 2.5) * 0.3;
    }

    // ── CELEBRATE: sparkles orbit; faded in/out by group scale (never unmount). ──
    const sg = sparkleGroup.current;
    if (sg) {
      const targetS = gesture === "celebrate" ? 1 : 0;
      const k = targetS > sg.scale.x ? 6 : 9; // per-second fade in / out
      const s = sg.scale.x + (targetS - sg.scale.x) * Math.min(1, k * dt);
      sg.scale.setScalar(s);
      if (s > 0.01) {
        for (let i = 0; i < 6; i++) {
          const sp = sparkleRefs[i].current;
          if (sp) {
            const ang = (i / 6) * Math.PI * 2 + t * 2.5; // orbit; inlined to avoid a per-frame tuple
            sp.position.set(Math.cos(ang) * 0.5, Math.sin(t * 3 + i) * 0.2, Math.sin(ang) * 0.5);
          }
        }
      }
    }
  });

  return (
    <group ref={group} position={[start.x, groundY(start.x, start.z) + LIFT, start.z]} scale={baseScale}>
      {/* contact shadow — grounds the creature; squashes as it hops */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, -(LIFT - 0.01), 0]} renderOrder={-1}>
        <circleGeometry args={[0.28, 12]} />
        <meshStandardMaterial color={0x000000} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* the living light — tight so Bloom hits the body, not a wide halo */}
      <pointLight ref={light} color={WORLD.ember} intensity={1.5} distance={4.5} decay={2.5} position={[0, 0.25, 0]} />

      {/* ── torso: a chunky faceted prism (weighted body, not an ice shard) over a
          glowing emissive heart. The heart (ref) carries the breath + mode glow. ── */}
      <mesh castShadow scale-y={0.92}>
        <cylinderGeometry args={[0.22, 0.32, 0.7, 6, 1]} />
        <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.18} transparent opacity={0.28} roughness={0.5} metalness={0.12} flatShading />
      </mesh>
      <mesh ref={body} scale-y={0.88}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial ref={mat} color={WORLD.emberHi} emissive={WORLD.ember} emissiveIntensity={0.9} flatShading roughness={0.4} transparent opacity={0.95} />
      </mesh>

      {/* ── head: looks where it's called (yaw on headGroup) + nods (pitch on
          headPitch). Eyes + lids ride the pitch; ears yaw with the head only. ── */}
      <group ref={headGroup} position={[0, HEAD_Y, 0.28]}>
        <group ref={headPitch}>
          <mesh castShadow>
            <icosahedronGeometry args={[0.24, 1]} />
            <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.55} flatShading roughness={0.3} metalness={0.3} />
          </mesh>

          {/* eyes — flat dark discs with a bright specular dot (a wet, looking eye) */}
          <mesh ref={eyeL} position={[-0.1, 0.02, 0.2]} rotation-x={-0.16}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial color={0x14161d} roughness={1} />
            <mesh position={[0.012, 0.014, 0.002]}>
              <sphereGeometry args={[0.016, 6, 6]} />
              <meshStandardMaterial color={0xffffff} emissive={0xfff8e8} emissiveIntensity={0.8} />
            </mesh>
          </mesh>
          <mesh ref={eyeR} position={[0.1, 0.02, 0.2]} rotation-x={-0.16}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial color={0x14161d} roughness={1} />
            <mesh position={[-0.012, 0.014, 0.002]}>
              <sphereGeometry args={[0.016, 6, 6]} />
              <meshStandardMaterial color={0xffffff} emissive={0xfff8e8} emissiveIntensity={0.8} />
            </mesh>
          </mesh>

          {/* eyelids — ember planes that sweep shut (scale-y 0 open → 1 closed) */}
          <mesh ref={lidL} position={[-0.1, 0.02, 0.205]} scale-y={0}>
            <planeGeometry args={[0.1, 0.058]} />
            <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.4} />
          </mesh>
          <mesh ref={lidR} position={[0.1, 0.02, 0.205]} scale-y={0}>
            <planeGeometry args={[0.1, 0.058]} />
            <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.4} />
          </mesh>
        </group>

        {/* ears — sharp triangular, from the Juvenile stage (they flick) */}
        {stage >= 2 && (
          <>
            <mesh ref={earL} position={[-0.13, 0.22, 0]} rotation-z={0.32} castShadow>
              <coneGeometry args={[0.08, 0.22, 3]} />
              <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading />
            </mesh>
            <mesh ref={earR} position={[0.13, 0.22, 0]} rotation-z={-0.32} castShadow>
              <coneGeometry args={[0.08, 0.22, 3]} />
              <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.5} flatShading />
            </mesh>
          </>
        )}
      </group>

      {/* ── four stubby legs (apex down) — step in a diagonal gait ── */}
      {[
        [-0.2, 0.16],
        [0.2, 0.16],
        [-0.2, -0.16],
        [0.2, -0.16],
      ].map(([x, z], i) => (
        <mesh key={i} ref={legRefs[i]} position={[x, -0.34, z]} rotation-x={Math.PI} castShadow>
          <coneGeometry args={[0.08, 0.26, 4]} />
          <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={0.3} flatShading roughness={0.6} />
        </mesh>
      ))}

      {/* ── a wisp tail of light — wags by mood + lags the turn (follow-through) ── */}
      <group ref={tailGroup} position={[0, 0.06, -0.4]}>
        <mesh>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={1.1} flatShading transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.14, -0.1]}>
          <icosahedronGeometry args={[0.08, 0]} />
          <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={1.2} flatShading transparent opacity={0.85} />
        </mesh>
      </group>

      {/* ── work ring: present + spinning only while a tool runs ── */}
      {showRing && (
        <mesh ref={ringRef} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.5, 0.012, 6, 24]} />
          <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={0.6} transparent opacity={0.55} />
        </mesh>
      )}

      {/* ── celebrate sparkles: always mounted, faded in by scale on celebrate ── */}
      <group ref={sparkleGroup} scale={0}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} ref={sparkleRefs[i]}>
            <icosahedronGeometry args={[0.04, 0]} />
            <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={1.6} />
          </mesh>
        ))}
      </group>

      {/* emoji bubble above the head — shows what it's doing right now */}
      <PetBubble />
    </group>
  );
}
