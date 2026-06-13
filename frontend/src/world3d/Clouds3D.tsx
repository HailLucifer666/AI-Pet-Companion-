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

function buildPuffs(): Puff[] {
  const r = mulberry32(0xc10d);
  const puffs: Puff[] = [];
  let clusters = 0;
  while (puffs.length < PUFFS && clusters < 12) {
    const ang = r() * Math.PI * 2;
    const rad = 12 + r() * 22;
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    const cy = 14 + r() * 7;
    const n = 3 + Math.floor(r() * 2);
    for (let i = 0; i < n && puffs.length < PUFFS; i++) {
      puffs.push({
        x: cx + (r() - 0.5) * 3.2,
        y: cy + (r() - 0.5) * 1.2,
        z: cz + (r() - 0.5) * 3.2,
        sx: 2.4 + r() * 1.8,
        sy: 1.0 + r() * 0.6,
        sz: 2.4 + r() * 1.8,
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
      const target = Math.min(0.92, amount);
      const k = reduced ? 1 : Math.min(1, delta * 1.2);
      mat.current.opacity += (target - mat.current.opacity) * k;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, PUFFS]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 0]} />
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
