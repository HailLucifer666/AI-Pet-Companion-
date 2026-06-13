/** Lumenform3D — the companion, living on the island. A small low-poly creature
 *  that *is* a light: an ember-emissive body plus a real point light, so it glows
 *  on the ground around it. It reads the live FSM (worldStore.lumen / stage) and
 *  *moves*: each frame it walks toward wherever the FSM wants to be (home, the
 *  Workbench while a tool runs, a wander spot when idle), following the terrain
 *  and turning to face its travel. Arrived, it bobs / naps / hops by gesture.
 *  Reduced-motion → it sits, still, exactly where the state says it should be.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { arrive, placeTarget, WALK_SPEED } from "./locomotion";
import { petPos } from "./petPosition";
import { WORLD } from "./palette";

const LIFT = 0.55; // raise the body so it sits on the ground, not in it
const ACCEL = 3.2; // how briskly velocity chases the desired velocity (ease in/out)
const TURN = 4; // how briskly it rotates to face travel

const groundY = (x: number, z: number) => islandHeight(x, z, ISLAND_MAX_R);

export function Lumenform3D() {
  const reduced = useReducedMotion() ?? false;
  const stage = useWorldStore((s) => s.stage);

  const baseScale = 0.72 + stage * 0.12; // grows with life stage
  const start = useMemo(() => placeTarget("home"), []);

  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);

  // Live planar position + smoothed velocity + facing, carried frame-to-frame.
  const pos = useRef({ x: start.x, z: start.z });
  const vel = useRef({ vx: 0, vz: 0 });
  const heading = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05); // clamp long frames so a stall can't teleport it
    const { lumen } = useWorldStore.getState();
    const t = state.clock.elapsedTime;
    const target = placeTarget(lumen.place, lumen.wanderSeed);

    if (reduced) {
      // Static-but-alive: snap to where the state says, no motion for its own sake.
      const y = groundY(target.x, target.z) + LIFT;
      g.position.set(target.x, y, target.z);
      pos.current.x = target.x;
      pos.current.z = target.z;
      vel.current.vx = 0;
      vel.current.vz = 0;
      petPos.x = target.x;
      petPos.y = y;
      petPos.z = target.z;
      if (light.current) light.current.intensity = 2.2;
      if (mat.current) mat.current.emissiveIntensity = 0.8;
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
    const turn = d * Math.min(1, TURN * dt);
    g.rotation.y += turn;
    const lean = Math.max(-0.2, Math.min(0.2, -d * 0.5)); // bank toward the turn, capped
    g.rotation.z += (lean - g.rotation.z) * Math.min(1, 8 * dt);

    if (body.current) body.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04);

    const targetGlow =
      gesture === "nap" ? 0.6 : gesture === "celebrate" ? 4 : working ? 3.2 : moving ? 2.2 : 1.8;
    if (light.current) light.current.intensity += (targetGlow - light.current.intensity) * 0.08;
    if (mat.current) {
      const e = gesture === "nap" ? 0.3 : working ? 1.1 : 0.7;
      mat.current.emissiveIntensity += (e - mat.current.emissiveIntensity) * 0.08;
    }
  });

  return (
    <group ref={group} position={[start.x, groundY(start.x, start.z) + LIFT, start.z]} scale={baseScale}>
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

      {/* eyes — on the +Z face, so they lead the way it walks */}
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
