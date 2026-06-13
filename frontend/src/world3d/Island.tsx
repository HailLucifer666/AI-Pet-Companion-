/** Island — the low-poly Grove. A faceted terrain mesh (per-face flat colors,
 *  banded by height), a translucent water plane, and deterministically scattered
 *  low-poly pines and rocks. Geometry is built once in useMemo; same island every
 *  launch (heights from the pure terrain module). */

import { useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../world/engine/rng";
import { islandHeight } from "./terrain";
import { WORLD } from "./palette";

const SIZE = 22;
const SEG = 60;
const MAX_R = 10;
const FLOOR = -1.5;

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
  pos: [number, number, number];
  scale: number;
  rot: number;
}

function scatter(): { trees: Placement[]; rocks: Placement[] } {
  const r = mulberry32(0x9e07);
  const trees: Placement[] = [];
  const rocks: Placement[] = [];
  for (let i = 0; i < 320 && (trees.length < 30 || rocks.length < 20); i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * MAX_R * 0.9;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, MAX_R);
    if (y > 0.7 && y < 2.9 && trees.length < 30) {
      trees.push({ pos: [x, y - 0.1, z], scale: 0.7 + r() * 0.8, rot: r() * Math.PI * 2 });
    } else if (y > 0.25 && y < 3.6 && rocks.length < 20) {
      rocks.push({ pos: [x, y, z], scale: 0.5 + r() * 0.9, rot: r() * Math.PI * 2 });
    }
  }
  return { trees, rocks };
}

export function Island() {
  const terrain = useMemo(buildTerrain, []);
  const { trees, rocks } = useMemo(scatter, []);

  return (
    <group>
      <mesh geometry={terrain} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>

      {/* Water — sits at sea level, gently translucent. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color={WORLD.water}
          transparent
          opacity={0.82}
          roughness={0.4}
          metalness={0.1}
          flatShading
        />
      </mesh>

      {trees.map((t, i) => (
        <group key={`t${i}`} position={t.pos} scale={t.scale} rotation-y={t.rot}>
          <mesh castShadow position-y={0.4}>
            <cylinderGeometry args={[0.08, 0.13, 0.8, 5]} />
            <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
          </mesh>
          <mesh castShadow position-y={1.15}>
            <coneGeometry args={[0.55, 1.3, 6]} />
            <meshStandardMaterial color={WORLD.pine} flatShading roughness={1} />
          </mesh>
          <mesh castShadow position-y={1.85}>
            <coneGeometry args={[0.38, 0.95, 6]} />
            <meshStandardMaterial color={WORLD.pineHi} flatShading roughness={1} />
          </mesh>
        </group>
      ))}

      {rocks.map((rk, i) => (
        <mesh key={`r${i}`} position={rk.pos} scale={rk.scale} rotation-y={rk.rot} castShadow receiveShadow>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color={WORLD.rock} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
