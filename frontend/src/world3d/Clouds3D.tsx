/** Clouds3D — low-poly cloud puffs high over the Grove. One InstancedMesh of
 *  flattened icosahedra (a few clusters), drifting very slowly. Their opacity
 *  eases toward the real cloud amount, so a clear sky shows almost none and an
 *  overcast/stormy sky fills in. Lit by the scene, so they darken at night with
 *  everything else. Reduced-motion → present but still. */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "../world/engine/rng";

const PUFFS = 30; // ~8 clusters of 3–4 puffs
const CLOUD_COLOR = 0xdfe6ee;

const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();

interface Puff {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
}

// Placed HIGH and over the island (not out at sea): the high-diorama camera frames
// the whole island, so clusters that used to ring it at mid-height now read as
// floating rocks. Keeping them high + central + flat makes them read as sky again.
function buildPuffs(): Puff[] {
  const r = mulberry32(0xc10d);
  const puffs: Puff[] = [];
  let clusters = 0;
  while (puffs.length < PUFFS && clusters < 12) {
    const ang = r() * Math.PI * 2;
    const rad = 3 + r() * 14; // 3..17 — over the island, not floating out over the sea
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    const cy = 26 + r() * 9; // 26..35 — high in the sky, reads as overcast not rim-rock
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n && puffs.length < PUFFS; i++) {
      puffs.push({
        x: cx + (r() - 0.5) * 4,
        y: cy + (r() - 0.5) * 1.4,
        z: cz + (r() - 0.5) * 4,
        sx: 3.4 + r() * 2.4, // wider + flatter → a cloud sheet, not a faceted blob
        sy: 0.6 + r() * 0.45,
        sz: 3.4 + r() * 2.4,
      });
    }
    clusters++;
  }
  return puffs;
}

export function Clouds3D({ amount, reduced }: { amount: number; reduced: boolean }) {
  const puffs = useMemo(buildPuffs, []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const group = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    puffs.forEach((p, i) => {
      P.set(p.x, p.y, p.z);
      Q.identity();
      S.set(p.sx, p.sy, p.sz);
      M.compose(P, Q, S);
      mesh.current!.setMatrixAt(i, M);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [puffs]);

  useFrame((state, delta) => {
    if (group.current && !reduced) {
      const t = state.clock.elapsedTime;
      group.current.position.x = Math.sin(t * 0.02) * 4;
      group.current.position.z = Math.cos(t * 0.015) * 3;
    }
    if (mat.current) {
      const target = Math.min(0.55, amount); // wispy ceiling — soft cloud, not solid rock
      const k = reduced ? 1 : Math.min(1, delta * 1.2);
      mat.current.opacity += (target - mat.current.opacity) * k;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, PUFFS]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={mat}
          color={CLOUD_COLOR}
          flatShading
          transparent
          opacity={0}
          depthWrite={false}
          roughness={1}
        />
      </instancedMesh>
    </group>
  );
}
