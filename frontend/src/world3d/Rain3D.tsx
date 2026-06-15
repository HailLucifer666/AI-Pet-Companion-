/** Rain3D â€” falling rain when the real weather calls for it. One InstancedMesh of
 *  thin streaks in a column that tracks the pet (so rain is always around the
 *  view), recycled top-to-bottom. Density follows light/heavy; a storm adds
 *  occasional lightning (a brief sky flash). Reduced-motion â†’ no rain. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../world/engine/rng";
import { petPos } from "./petPosition";

const MAX = 360;
const RADIUS = 52; // wider spread â†’ rain veils the scene instead of pillaring on the pet (tracks the pet; partial scale for the bigger world)
const CORE_HOLE = 0.12; // keep a clear-ish core so streaks don't stack on the pet
const FALL_H = 30; // column height; drops recycle to the top after passing the ground
const RAIN_COLOR = 0xbcd4e6;

const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();

interface Drop {
  x: number;
  z: number;
  y: number;
  speed: number;
}

function buildDrops(): Drop[] {
  const r = mulberry32(0x9a1f);
  return Array.from({ length: MAX }, () => {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(CORE_HOLE + (1 - CORE_HOLE) * r()) * RADIUS;
    return {
      x: Math.cos(ang) * rad,
      z: Math.sin(ang) * rad,
      y: r() * FALL_H,
      speed: 16 + r() * 10,
    };
  });
}

export function Rain3D({
  rain,
  lightning,
  reduced,
}: {
  rain: "none" | "light" | "heavy";
  lightning: boolean;
  reduced: boolean;
}) {
  const drops = useMemo(buildDrops, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const flash = useRef(0);
  const nextFlash = useRef(0);
  const light = useRef<THREE.PointLight>(null);

  const active = rain === "heavy" ? MAX : rain === "light" ? 150 : 0;
  const lengthScale = rain === "heavy" ? 1.15 : 1;

  useFrame((state, delta) => {
    if (reduced) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const m = mesh.current;
    if (m) {
      m.count = active;
      for (let i = 0; i < active; i++) {
        const d = drops[i];
        d.y -= d.speed * dt;
        if (d.y < 0) d.y += FALL_H;
        P.set(petPos.x + d.x, d.y, petPos.z + d.z);
        Q.identity();
        S.set(1, lengthScale, 1);
        M.compose(P, Q, S);
        m.setMatrixAt(i, M);
      }
      if (active > 0) m.instanceMatrix.needsUpdate = true;
    }

    // Lightning: occasional sharp flash that decays.
    if (lightning && light.current) {
      if (t > nextFlash.current) {
        flash.current = 1;
        nextFlash.current = t + 4 + Math.random() * 9;
      }
      flash.current *= Math.exp(-dt * 6);
      light.current.position.set(petPos.x, 24, petPos.z);
      light.current.intensity = flash.current * 9;
    }
  });

  if (reduced || (rain === "none" && !lightning)) return null;

  return (
    <group>
      {rain !== "none" && (
        <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
          <boxGeometry args={[0.014, 0.4, 0.014]} />
          <meshBasicMaterial color={RAIN_COLOR} transparent opacity={0.22} depthWrite={false} />
        </instancedMesh>
      )}
      {lightning && <pointLight ref={light} color={0xcfe2ff} intensity={0} distance={360} decay={1.4} />}
    </group>
  );
}
