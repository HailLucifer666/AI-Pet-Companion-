/** InstancedModel — draw one GLB model across many placements with InstancedMesh
 *  (one draw call per submesh, however many placements). The model is loaded once,
 *  unit-normalised (largest dimension → 1, centred on XZ, base sat on y=0 — the same
 *  formula the preview used), and each of its meshes (trunk + foliage, etc.) becomes
 *  an InstancedMesh. Per-instance matrix = placement · normalize · submeshLocal.
 *  Original GLB materials/albedo are kept; the world lighting + bloom set the mood.
 *  Mirrors the raw-InstancedMesh pattern already used in Island.tsx — no new deps. */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { NATURE_ALL, natureUrl } from "./models";

export interface NaturePlacement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
}

interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  local: THREE.Matrix4;
}

// Shared scratch for composing instance matrices (created once).
const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const YAXIS = new THREE.Vector3(0, 1, 0);

function useParts(url: string): { parts: Part[]; norm: THREE.Matrix4 } {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 1 / maxDim;
    const norm = new THREE.Matrix4()
      .makeScale(s, s, s)
      .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
    const parts: Part[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) parts.push({ geometry: mesh.geometry, material: mesh.material, local: mesh.matrixWorld.clone() });
    });
    return { parts, norm };
  }, [scene]);
}

function PartMesh({
  part,
  norm,
  places,
  baseScale,
}: {
  part: Part;
  norm: THREE.Matrix4;
  places: NaturePlacement[];
  baseScale: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => new THREE.Matrix4().multiplyMatrices(norm, part.local), [norm, part.local]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    places.forEach((p, i) => {
      P.set(p.x, p.y, p.z);
      Q.setFromAxisAngle(YAXIS, p.rot);
      const sc = p.scale * baseScale;
      S.set(sc, sc, sc);
      M.compose(P, Q, S).multiply(base); // placement · normalize · submeshLocal
      mesh.setMatrixAt(i, M);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [places, base, baseScale]);

  return <instancedMesh ref={ref} args={[part.geometry, part.material, places.length]} castShadow receiveShadow />;
}

export function InstancedModel({
  url,
  places,
  baseScale = 1,
}: {
  url: string;
  places: NaturePlacement[];
  baseScale?: number;
}) {
  const { parts, norm } = useParts(url);
  if (places.length === 0) return null;
  return (
    <>
      {parts.map((part, i) => (
        <PartMesh key={i} part={part} norm={norm} places={places} baseScale={baseScale} />
      ))}
    </>
  );
}

NATURE_ALL.forEach((name) => useGLTF.preload(natureUrl(name)));
