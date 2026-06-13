/** Island — the low-poly Grove. A faceted terrain mesh (per-face flat colors,
 *  banded by height), a translucent sea, an inland pool, and deterministically
 *  scattered pines and rocks. The scatter is drawn with InstancedMesh — four draw
 *  calls for the whole forest — so the larger island still holds frame-rate on
 *  low-end GPUs. Geometry is built once; same island every launch. */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mulberry32 } from "../world/engine/rng";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { WORLD } from "./palette";

const SIZE = 36;
const SEG = 96;
const MAX_R = ISLAND_MAX_R;
const FLOOR = -1.5;

const POOL = { x: 5.5, z: 3.5, r: 2.0 };
const MEADOW_R = 4.5; // open clearing in the middle — where the pet roams, no trees
// Keep scatter off the pool and the three Place markers (placeDefs coords).
const CLEAR_ZONES: { x: number; z: number; r: number }[] = [
  { x: POOL.x, z: POOL.z, r: POOL.r + 0.8 },
  { x: -5, z: -2.5, r: 1.8 }, // hollow
  { x: 4.5, z: -3.3, r: 1.8 }, // garden
  { x: -4, z: 3.8, r: 1.8 }, // workbench
];

function colorForHeight(y: number): THREE.Color {
  let hex: number;
  if (y < 0.12) hex = WORLD.sand;
  else if (y < 1.3) hex = WORLD.grassLow;
  else if (y < 2.4) hex = WORLD.grass;
  else if (y < 3.4) hex = WORLD.grassHigh;
  else if (y < 4.3) hex = WORLD.rock;
  else hex = WORLD.snow;
  return new THREE.Color(hex);
}

function buildTerrain(): THREE.BufferGeometry {
  const plane = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  plane.rotateX(-Math.PI / 2);
  const pos = plane.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.max(FLOOR, islandHeight(pos.getX(i), pos.getZ(i), MAX_R));
    pos.setY(i, y);
  }
  // Non-indexed → each triangle is independent: flat normals + crisp per-face color.
  const geo = plane.toNonIndexed();
  plane.dispose();
  const p = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const faceY = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const c = colorForHeight(faceY);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r;
      colors[(i + k) * 3 + 1] = c.g;
      colors[(i + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

interface Placement {
  x: number;
  y: number;
  z: number;
  scale: number;
  rot: number;
}

function clearOf(x: number, z: number): boolean {
  return CLEAR_ZONES.every((c) => Math.hypot(x - c.x, z - c.z) > c.r);
}

const TREE_GAP = 1.6; // min spacing so pines read as scattered, never a wall

function scatter(): { trees: Placement[]; rocks: Placement[] } {
  const r = mulberry32(0x9e07);
  const trees: Placement[] = [];
  const rocks: Placement[] = [];
  for (let i = 0; i < 2000 && (trees.length < 38 || rocks.length < 30); i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * MAX_R * 0.92;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, MAX_R);
    if (!clearOf(x, z)) continue;
    // Trees ring the open meadow, spaced apart; rocks may sit closer in.
    if (rad > MEADOW_R && y > 0.7 && y < 2.2 && trees.length < 38) {
      if (trees.every((t) => Math.hypot(x - t.x, z - t.z) > TREE_GAP)) {
        trees.push({ x, y: y - 0.1, z, scale: 0.6 + r() * 0.55, rot: r() * Math.PI * 2 });
      }
    } else if (y > 0.25 && y < 3.2 && rocks.length < 30) {
      rocks.push({ x, y, z, scale: 0.45 + r() * 0.8, rot: r() * Math.PI * 2 });
    }
  }
  return { trees, rocks };
}

// Shared temporaries for composing instance matrices (created once).
const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const Q = new THREE.Quaternion();
const S = new THREE.Vector3();
const YAXIS = new THREE.Vector3(0, 1, 0);

function setInstance(
  mesh: THREE.InstancedMesh,
  i: number,
  x: number,
  y: number,
  z: number,
  s: number,
  rot: number,
): void {
  P.set(x, y, z);
  Q.setFromAxisAngle(YAXIS, rot);
  S.set(s, s, s);
  M.compose(P, Q, S);
  mesh.setMatrixAt(i, M);
}

function Scatter() {
  const { trees, rocks } = useMemo(scatter, []);
  const trunk = useRef<THREE.InstancedMesh>(null);
  const low = useRef<THREE.InstancedMesh>(null);
  const high = useRef<THREE.InstancedMesh>(null);
  const rock = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    trees.forEach((t, i) => {
      const s = t.scale;
      if (trunk.current) setInstance(trunk.current, i, t.x, t.y + 0.33 * s, t.z, s, t.rot);
      if (low.current) setInstance(low.current, i, t.x, t.y + 0.86 * s, t.z, s, t.rot);
      if (high.current) setInstance(high.current, i, t.x, t.y + 1.42 * s, t.z, s, t.rot);
    });
    rocks.forEach((rk, i) => {
      if (rock.current) setInstance(rock.current, i, rk.x, rk.y, rk.z, rk.scale, rk.rot);
    });
    for (const ref of [trunk, low, high, rock]) {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    }
  }, [trees, rocks]);

  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.11, 0.66, 5]} />
        <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={low} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[0.5, 1.04, 6]} />
        <meshStandardMaterial color={WORLD.pine} flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={high} args={[undefined, undefined, trees.length]} castShadow>
        <coneGeometry args={[0.32, 0.74, 6]} />
        <meshStandardMaterial color={WORLD.pineHi} flatShading roughness={1} />
      </instancedMesh>
      <instancedMesh ref={rock} args={[undefined, undefined, rocks.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={WORLD.rock} flatShading roughness={1} />
      </instancedMesh>
    </group>
  );
}

/** A small inland pool: a translucent surface over a darker "deep" disc (reads as
 *  depth), ringed by rocks and a few reeds. Sits in a natural low spot on land. */
function Pool() {
  const surface = islandHeight(POOL.x, POOL.z, MAX_R) + 0.12;
  const rim = useMemo(() => {
    const r = mulberry32(0x500c);
    return Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2;
      const rad = POOL.r + 0.15;
      return { x: Math.cos(a) * rad, z: Math.sin(a) * rad, s: 0.28 + r() * 0.3, rot: r() * Math.PI * 2 };
    });
  }, []);

  return (
    <group position={[POOL.x, 0, POOL.z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={surface - 0.22}>
        <circleGeometry args={[POOL.r - 0.1, 20]} />
        <meshStandardMaterial color={WORLD.waterDeep} roughness={0.5} flatShading />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={surface} receiveShadow>
        <circleGeometry args={[POOL.r, 22]} />
        <meshStandardMaterial color={WORLD.water} transparent opacity={0.78} roughness={0.3} metalness={0.15} />
      </mesh>
      {rim.map((s, i) => (
        <mesh key={i} position={[s.x, surface, s.z]} scale={s.s} rotation-y={s.rot} castShadow receiveShadow>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color={WORLD.rock} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function Island() {
  const terrain = useMemo(buildTerrain, []);

  return (
    <group>
      <mesh geometry={terrain} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>

      {/* The surrounding sea — vast enough that its edge is always far beyond the
          fog, so the world never shows a hard cut at any camera angle. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial color={WORLD.water} transparent opacity={0.82} roughness={0.4} metalness={0.1} flatShading />
      </mesh>

      <Pool />
      <Scatter />
    </group>
  );
}
