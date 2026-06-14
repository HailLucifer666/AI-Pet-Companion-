/** Island — the low-poly Grove. A faceted terrain mesh (per-face flat colors,
 *  banded by height), a translucent sea, an inland pool, and deterministically
 *  scattered nature: real low-poly GLB trees, rocks, bushes and grass (Quaternius,
 *  CC0), each instanced (one draw call per submesh) so the island holds frame-rate
 *  on low-end GPUs. The placement is seeded — same island every launch. */

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { mulberry32 } from "../world/engine/rng";
import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
import { WORLD } from "./palette";
import { InstancedModel, type NaturePlacement } from "./nature/InstancedModel";
import { NATURE_TREES, NATURE_ROCKS, NATURE_BUSHES, NATURE_GRASS, natureUrl } from "./nature/models";

const W = WORLD_SCALE;
const SIZE = 36 * W; // terrain plane — must fully contain the island (≥ 2 × MAX_R)
const SEG = 200; // subdivision — kept dense enough that faces stay ~1.3 u over the bigger plane
const MAX_R = ISLAND_MAX_R;
const FLOOR = -1.5;

const POOL = { x: 5.5 * W, z: 3.5 * W, r: 2.0 }; // position scales out; the pond itself stays small
const MEADOW_R = 4.5 * W; // open clearing in the middle — where the pet roams, no trees
// Keep scatter off the pool and the three Place markers (placeDefs coords × scale).
const CLEAR_ZONES: { x: number; z: number; r: number }[] = [
  { x: POOL.x, z: POOL.z, r: POOL.r + 0.8 },
  { x: -1 * W, z: -1 * W, r: 5.5 }, // village plaza (hearth hub)
  { x: -5 * W, z: -2.5 * W, r: 4.0 }, // hollow (tavern)
  { x: 4.5 * W, z: -3.3 * W, r: 4.0 }, // garden (greenhouse)
  { x: -4 * W, z: 3.8 * W, r: 4.0 }, // workbench (forge)
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

type Placement = NaturePlacement;

function clearOf(x: number, z: number): boolean {
  return CLEAR_ZONES.every((c) => Math.hypot(x - c.x, z - c.z) > c.r);
}

const TREE_GAP = 1.6; // min spacing so pines read as scattered, never a wall

function scatter(): { trees: Placement[]; rocks: Placement[] } {
  const r = mulberry32(0x9e07);
  const trees: Placement[] = [];
  const rocks: Placement[] = [];
  for (let i = 0; i < 24000 && (trees.length < 260 || rocks.length < 170); i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * MAX_R * 0.92;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, MAX_R);
    if (!clearOf(x, z)) continue;
    // Trees ring the open meadow, spaced apart; rocks may sit closer in.
    if (rad > MEADOW_R && y > 0.7 && y < 2.2 && trees.length < 260) {
      if (trees.every((t) => Math.hypot(x - t.x, z - t.z) > TREE_GAP)) {
        trees.push({ x, y: y - 0.1, z, scale: 0.6 + r() * 0.55, rot: r() * Math.PI * 2 });
      }
    } else if (y > 0.25 && y < 3.2 && rocks.length < 170) {
      rocks.push({ x, y, z, scale: 0.45 + r() * 0.8, rot: r() * Math.PI * 2 });
    }
  }
  return { trees, rocks };
}

/** Lower ground cover — bushes + grass tufts — on a separate seed so it never
 *  shifts the tree/rock placement above. Sits in the low/outer band, off the
 *  meadow and the Place markers. */
function scatterGround(): { bushes: Placement[]; grass: Placement[] } {
  const r = mulberry32(0x5a11);
  const bushes: Placement[] = [];
  const grass: Placement[] = [];
  for (let i = 0; i < 18000 && (bushes.length < 70 || grass.length < 140); i++) {
    const ang = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * MAX_R * 0.9;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, MAX_R);
    if (!clearOf(x, z)) continue;
    if (rad > MEADOW_R * 0.7 && y > 0.3 && y < 2.2 && bushes.length < 70) {
      bushes.push({ x, y, z, scale: 0.6 + r() * 0.5, rot: r() * Math.PI * 2 });
    } else if (y > 0.2 && y < 2.6 && grass.length < 140) {
      grass.push({ x, y, z, scale: 0.7 + r() * 0.6, rot: r() * Math.PI * 2 });
    }
  }
  return { bushes, grass };
}

// Per-category display scale (× each placement's own scale) — tunes the unit-
// normalised GLBs to island proportions.
const TREE_BASE = 3.0;
const ROCK_BASE = 1.1;
const BUSH_BASE = 1.4;
const GRASS_BASE = 1.2;

/** Split placements round-robin across a model list (deterministic by index, so
 *  it never disturbs the placement RNG). Each model gets every Nth placement. */
function roundRobin(places: Placement[], models: string[]): Placement[][] {
  return models.map((_, k) => places.filter((_, i) => i % models.length === k));
}

function Scatter() {
  const { trees, rocks } = useMemo(scatter, []);
  const { bushes, grass } = useMemo(scatterGround, []);
  const treeGroups = useMemo(() => roundRobin(trees, NATURE_TREES), [trees]);
  const rockGroups = useMemo(() => roundRobin(rocks, NATURE_ROCKS), [rocks]);
  const bushGroups = useMemo(() => roundRobin(bushes, NATURE_BUSHES), [bushes]);

  return (
    <Suspense fallback={null}>
      {NATURE_TREES.map((name, k) => (
        <InstancedModel key={name} url={natureUrl(name)} places={treeGroups[k]} baseScale={TREE_BASE} />
      ))}
      {NATURE_ROCKS.map((name, k) => (
        <InstancedModel key={name} url={natureUrl(name)} places={rockGroups[k]} baseScale={ROCK_BASE} />
      ))}
      {NATURE_BUSHES.map((name, k) => (
        <InstancedModel key={name} url={natureUrl(name)} places={bushGroups[k]} baseScale={BUSH_BASE} />
      ))}
      <InstancedModel url={natureUrl(NATURE_GRASS[0])} places={grass} baseScale={GRASS_BASE} />
    </Suspense>
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
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow={false}>
        <planeGeometry args={[320 * W, 320 * W]} />
        <meshStandardMaterial color={WORLD.water} transparent opacity={0.82} roughness={0.4} metalness={0.1} flatShading />
      </mesh>

      <Pool />
      <Scatter />
    </group>
  );
}
