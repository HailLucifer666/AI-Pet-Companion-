/** QuickeningScene — the in-world backdrop for the first-run hatch. A dedicated,
 *  lightweight 3D scene (NOT the full world) behind the ritual's questions: a dark
 *  grove that holds deep night while you answer, warms as each question lands, then
 *  cubic-eases into a FIRST DAWN at the moment of hatching. Lighting comes straight
 *  from the shared day/night palette (daylightAt) driven by the pure rampHour, so it
 *  reads identically to the real world the companion will wake into.
 *
 *  Pointer-events-none — the question overlay above it owns all input. Reduced-motion:
 *  the light snaps (no easing). Mounted only when WebGL is available + the cinematic
 *  hasn't errored (HatchRitual gates it behind hasWebGL + an ErrorBoundary). */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import {
  AdditiveBlending,
  Color,
  Fog,
  MeshStandardMaterial,
  Vector3,
  type BufferAttribute,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type Points,
  type PointLight,
  type PointsMaterial,
} from "three";
import { daylightAt } from "../../world3d/daylight";
import { rampHour, type QuickeningPhase } from "../../world3d/quickeningRamp";
import { WORLD } from "../../world3d/palette";

type HatchPhase = "intro" | "questions" | "brain" | "hatching" | "revealed";

/** Map the ritual's phases onto the dawn schedule: questions warm the sky, the
 *  brain-check holds the breath at pre-dawn, hatching/revealed break into dawn. */
function toQuickening(p: HatchPhase): QuickeningPhase {
  if (p === "intro") return "idle";
  if (p === "questions") return "questions";
  if (p === "brain") return "hatching";
  return "dawn";
}

// A fixed ring of silhouette "trees" around the horizon — a grove, not the village.
const TREES: [number, number][] = [
  [-9, -6], [-5, -11], [4, -12], [9, -7], [12, -2], [-12, 0], [7, 3], [-8, 4], [0, -14], [-3, 5],
];

function Dawn({ phase, qi, reduced }: { phase: HatchPhase; qi: number; reduced: boolean }) {
  const scene = useThree((s) => s.scene);
  const dir = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const dawnStart = useRef<number | null>(null);
  const tmp = useMemo(() => new Color(), []);

  useEffect(() => {
    const base = daylightAt(1.0); // start in deep night
    scene.background = new Color(base.sky);
    scene.fog = new Fog(base.sky, 7, 46);
    return () => {
      scene.background = null;
      scene.fog = null;
    };
  }, [scene]);

  useFrame((state, delta) => {
    const qp = toQuickening(phase);
    if (qp === "dawn") {
      if (dawnStart.current === null) dawnStart.current = state.clock.elapsedTime;
    } else {
      dawnStart.current = null;
    }
    const elapsedMs = qp === "dawn" && dawnStart.current !== null ? (state.clock.elapsedTime - dawnStart.current) * 1000 : 0;
    const base = daylightAt(rampHour(qp, qi, elapsedMs));
    const k = reduced ? 1 : 1 - Math.exp(-1.6 * delta);

    const bg = scene.background;
    if (bg instanceof Color) bg.lerp(tmp.set(base.sky), k);
    const fog = scene.fog;
    if (fog instanceof Fog) fog.color.lerp(tmp.set(base.sky), k);
    if (dir.current) {
      dir.current.intensity += (base.sunIntensity - dir.current.intensity) * k;
      dir.current.color.lerp(tmp.set(base.sun), k);
      dir.current.position.set(base.sunDir[0], base.sunDir[1], base.sunDir[2]);
    }
    if (hemi.current) {
      hemi.current.intensity += (base.hemiIntensity - hemi.current.intensity) * k;
      hemi.current.color.lerp(tmp.set(base.sky), k);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} color={0x070b18} groundColor={0x0a0e08} intensity={0.32} />
      <directionalLight ref={dir} color={0x3a5a86} intensity={0.22} position={[-4, 9, -6]} />
      {/* ground */}
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color={0x10160f} roughness={1} flatShading />
      </mesh>
      {/* grove silhouettes */}
      {TREES.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.2, z]}>
          <coneGeometry args={[0.75, 2.6, 5]} />
          <meshStandardMaterial color={0x0c120c} roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

/* ── The egg in the grove ────────────────────────────────────────────────
 * A glowing ovoid waiting on the dark ground at the centre of the scene, lit by
 * its own warm point light. It brightens as each question lands, swells into a
 * hot burst at the moment of hatching, then vanishes on reveal (the awakened
 * companion takes over in the DOM above). Reduced-motion: no bob, snap glow. */
const EGG_Y = 0.85;
const EGG_Z = 2.0;

function eggEmissive(phase: HatchPhase, qi: number): number {
  switch (phase) {
    case "revealed":
      return 0;
    case "hatching":
      return 2.8; // hot burst
    case "brain":
      return 1.5; // held breath, pre-dawn
    case "questions":
      return 1.0 + Math.min(qi, 4) * 0.14; // warms as you answer
    default:
      return 0.85; // intro
  }
}

function eggScale(phase: HatchPhase): number {
  if (phase === "revealed") return 0.01;
  if (phase === "hatching") return 1.16;
  return 1.0;
}

function Egg3D({ phase, qi, reduced }: { phase: HatchPhase; qi: number; reduced: boolean }) {
  const grp = useRef<Group>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const light = useRef<PointLight>(null);
  const ei = useRef(0.85);
  const sc = useRef(1.0);

  useFrame((state, delta) => {
    const targetEi = eggEmissive(phase, qi);
    const targetSc = eggScale(phase);
    const k = reduced ? 1 : 1 - Math.exp(-5 * delta);
    ei.current += (targetEi - ei.current) * k;
    sc.current += (targetSc - sc.current) * k;
    if (mat.current) mat.current.emissiveIntensity = ei.current;
    if (light.current) light.current.intensity = ei.current * 1.4;
    if (grp.current) {
      const bob = reduced ? 0 : Math.sin(state.clock.elapsedTime * 1.3) * 0.06;
      grp.current.scale.setScalar(sc.current);
      grp.current.position.y = EGG_Y + bob;
      grp.current.visible = sc.current > 0.02;
    }
  });

  return (
    <group ref={grp} position={[0, EGG_Y, EGG_Z]}>
      <mesh scale={[1, 1.32, 1]}>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshStandardMaterial
          ref={mat}
          color={0x2a1c0e}
          emissive={WORLD.botGlow}
          emissiveIntensity={0.85}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      <pointLight ref={light} color={WORLD.emberHi} intensity={1.2} distance={9} decay={2} />
    </group>
  );
}

/* ── Emergence motes ─────────────────────────────────────────────────────
 * A one-shot burst of warm sparks that fountains up out of the egg the instant
 * it hatches and rises into the new dawn as the companion appears, then fades.
 * Additive, un-tonemapped points so they read as light. Reduced-motion: none. */
const MOTE_COUNT = 64;
const MOTE_LIFE = 2.4; // seconds

function EmergenceMotes({ phase, reduced }: { phase: HatchPhase; reduced: boolean }) {
  const pts = useRef<Points>(null);
  const mat = useRef<PointsMaterial>(null);
  const burstStart = useRef<number | null>(null);

  // Per-mote launch origin + direction, seeded once (upward bias, fanned out).
  const { positions, dirs } = useMemo(() => {
    const positions = new Float32Array(MOTE_COUNT * 3);
    const dirs = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.1 + Math.random() * 0.4;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(a) * r;
      dirs[i * 3] = Math.cos(a) * (0.5 + Math.random() * 0.6);
      dirs[i * 3 + 1] = 1.4 + Math.random() * 1.8;
      dirs[i * 3 + 2] = Math.sin(a) * (0.5 + Math.random() * 0.6);
    }
    return { positions, dirs };
  }, []);

  useFrame((state) => {
    const bursting = phase === "hatching" || phase === "revealed";
    if (reduced || !bursting) {
      burstStart.current = null;
      if (pts.current) pts.current.visible = false;
      return;
    }
    if (burstStart.current === null) burstStart.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - burstStart.current;
    if (t > MOTE_LIFE) {
      if (pts.current) pts.current.visible = false;
      return;
    }
    if (pts.current) pts.current.visible = true;
    const e = 1 - Math.pow(1 - t / MOTE_LIFE, 2); // ease-out rise
    const attr = pts.current?.geometry.attributes.position as BufferAttribute | undefined;
    if (attr) {
      for (let i = 0; i < MOTE_COUNT; i++) {
        attr.setXYZ(
          i,
          positions[i * 3] + dirs[i * 3] * e,
          positions[i * 3 + 1] + dirs[i * 3 + 1] * e,
          positions[i * 3 + 2] + dirs[i * 3 + 2] * e,
        );
      }
      attr.needsUpdate = true;
    }
    if (mat.current) mat.current.opacity = 0.9 * (1 - t / MOTE_LIFE);
  });

  return (
    <points ref={pts} position={[0, EGG_Y, EGG_Z]} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={MOTE_COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        color={WORLD.emberHi}
        size={0.14}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ── Dolly ───────────────────────────────────────────────────────────────
 * A slow, unbroken push toward the egg: far at the intro, drawing closer with
 * each question answered, holding its breath at the brain-check, pressing into
 * the burst at hatch, then easing back to let the first dawn breathe at reveal.
 * Always re-aimed at the egg so it stays centred. Reduced-motion: snap to each
 * phase's framing (no glide). */
const DOLLY: Record<HatchPhase, [number, number, number]> = {
  intro: [0, 2.4, 9.0],
  questions: [0, 2.2, 7.5], // z refined per question below
  brain: [0, 2.0, 6.2],
  hatching: [0, 1.9, 5.6],
  revealed: [0, 2.6, 8.5],
};

function DollyRig({ phase, qi, reduced }: { phase: HatchPhase; qi: number; reduced: boolean }) {
  const cam = useThree((s) => s.camera);
  const target = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(0, 0.7, EGG_Z - 0.4), []);

  useFrame((_, delta) => {
    const [x, y, baseZ] = DOLLY[phase];
    const z = phase === "questions" ? 8.6 - Math.min(qi, 4) * 0.45 : baseZ; // 8.6 → 6.8
    target.set(x, y, z);
    const k = reduced ? 1 : 1 - Math.exp(-2.2 * delta);
    cam.position.lerp(target, k);
    cam.lookAt(look);
  });
  return null;
}

/* ── Region kindling ─────────────────────────────────────────────────────
 * The master-plan beat: each answer lights a region of the dark grove. Five
 * ember cairns ring the mid-grove behind the egg; as each question is answered
 * the matching one bursts (cubic-out) then settles to a steady warm glow, and
 * the last kindles as the brain-check is reached — so by the dawn the whole
 * grove is alive. Pure emissive (no dynamic lights). Reduced-motion: the
 * answered regions are simply lit, no burst. */
const N_REGIONS = 5;
const REGION_FLASH = 0.9; // seconds

function regionsLit(phase: HatchPhase, qi: number): number {
  if (phase === "intro") return 0;
  if (phase === "questions") return Math.min(qi, N_REGIONS); // one per answer given
  return N_REGIONS; // brain / hatching / revealed → all alight
}

function RegionKindle({ phase, qi, reduced }: { phase: HatchPhase; qi: number; reduced: boolean }) {
  const prevLit = useRef(0);
  const flashIdx = useRef(-1);
  const flashStart = useRef(0);
  const eased = useRef<number[]>(new Array(N_REGIONS).fill(0));

  const regions = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < N_REGIONS; i++) {
      const a = -0.9 + (1.8 * i) / (N_REGIONS - 1); // fan ~±51° behind the egg
      out.push([Math.sin(a) * 5.0, 0.3, -3.0 - Math.cos(a) * 1.3]);
    }
    return out;
  }, []);

  const mats = useMemo(
    () =>
      regions.map(
        () =>
          new MeshStandardMaterial({
            color: 0x1a1206,
            emissive: new Color(WORLD.ember),
            emissiveIntensity: 0,
            roughness: 0.55,
            toneMapped: false,
          }),
      ),
    [regions],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  useFrame((state, delta) => {
    const target = regionsLit(phase, qi);
    if (target > prevLit.current) {
      flashIdx.current = target - 1;
      flashStart.current = state.clock.elapsedTime;
    }
    prevLit.current = target;
    const k = reduced ? 1 : 1 - Math.exp(-3 * delta);
    for (let i = 0; i < N_REGIONS; i++) {
      const want = i < target ? 1 : 0;
      eased.current[i] += (want - eased.current[i]) * k;
      let e = eased.current[i] * 1.5; // steady glow
      if (!reduced && i === flashIdx.current) {
        const ft = state.clock.elapsedTime - flashStart.current;
        if (ft < REGION_FLASH) e += Math.pow(1 - ft / REGION_FLASH, 3) * 2.4; // burst
      }
      mats[i].emissiveIntensity = e;
    }
  });

  return (
    <>
      {regions.map((p, i) => (
        <group key={i} position={p}>
          <mesh material={mats[i]}>
            <icosahedronGeometry args={[0.34, 0]} />
          </mesh>
          {/* soft glow pooled on the ground beneath the ember */}
          <mesh material={mats[i]} rotation-x={-Math.PI / 2} position-y={-0.28}>
            <circleGeometry args={[0.95, 24]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function QuickeningScene({ phase, qi }: { phase: HatchPhase; qi: number }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="absolute inset-0" aria-hidden style={{ pointerEvents: "none" }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.4, 9], fov: 50, near: 0.1, far: 120 }}
        gl={{ antialias: true }}
      >
        <DollyRig phase={phase} qi={qi} reduced={reduced} />
        <Dawn phase={phase} qi={qi} reduced={reduced} />
        <RegionKindle phase={phase} qi={qi} reduced={reduced} />
        <Egg3D phase={phase} qi={qi} reduced={reduced} />
        <EmergenceMotes phase={phase} reduced={reduced} />
        <Stars radius={70} depth={30} count={700} factor={3} saturation={0.2} fade speed={reduced ? 0 : 0.25} />
      </Canvas>
    </div>
  );
}
