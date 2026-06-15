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
import { Color, Fog, type DirectionalLight, type HemisphereLight } from "three";
import { daylightAt } from "../../world3d/daylight";
import { rampHour, type QuickeningPhase } from "../../world3d/quickeningRamp";

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

export function QuickeningScene({ phase, qi }: { phase: HatchPhase; qi: number }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <div className="absolute inset-0" aria-hidden style={{ pointerEvents: "none" }}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 2.4, 9], fov: 50, near: 0.1, far: 120 }}
        gl={{ antialias: true }}
      >
        <Dawn phase={phase} qi={qi} reduced={reduced} />
        <Stars radius={70} depth={30} count={700} factor={3} saturation={0.2} fade speed={reduced ? 0 : 0.25} />
      </Canvas>
    </div>
  );
}
