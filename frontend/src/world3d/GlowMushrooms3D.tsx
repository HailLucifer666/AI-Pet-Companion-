/** GlowMushrooms3D â€” bioluminescent caps scattered across the island's mid-band,
 *  the ground-level glow of "The Mycelium" (lifted from the hero concept art). Each
 *  is a tiny stem + an emissive cap; only the first few carry a real point-light so
 *  nearby terrain picks up their colour (capped for perf). All caps + lights brighten
 *  at night via glowBoost â€” the "full-glow night" grade. Deterministic placement â†’
 *  same field every launch; kept clear of the central meadow + Place markers.
 *  Reduced-motion: present and lit, just no flicker. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { MeshStandardMaterial, PointLight } from "three";
import { mulberry32 } from "../world/engine/rng";
import { islandHeight, ISLAND_MAX_R, WORLD_SCALE } from "./terrain";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";

const COUNT = 26; // scattered bioluminescent spots â€” thinned for a cleaner, less-busy island
const CAP_BASE = 1.1; // base emissive; Ã—glowBoost at night
const LIGHT_BASE = 0.32;
const MEADOW_R = 4.8 * WORLD_SCALE; // keep clear of the central roaming meadow
const CAP_COLORS = [0x49d39a, 0x6be9ff, 0x9d7bff, 0x8be06a]; // bio cyan/violet/lime

interface Spot {
  x: number;
  y: number;
  z: number;
  s: number;
  color: number;
}

function place(): Spot[] {
  const r = mulberry32(0x5eed);
  const spots: Spot[] = [];
  for (let i = 0; i < 18000 && spots.length < COUNT; i++) {
    const ang = r() * Math.PI * 2;
    const rad = MEADOW_R + r() * 8 * WORLD_SCALE; // mid-band, off the meadow, spread to the island
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const y = islandHeight(x, z, ISLAND_MAX_R);
    if (y < 0.35 || y > 2.3) continue; // on grassy land, not sand or peak
    if (spots.some((s) => Math.hypot(x - s.x, z - s.z) < 1.2)) continue; // spaced
    spots.push({ x, y, z, s: 0.6 + r() * 0.7, color: CAP_COLORS[Math.floor(r() * CAP_COLORS.length)] });
  }
  return spots;
}

/** `lit` = how many caps carry a real point-light (the GPU-tier quality ladder caps
 *  it; 0 on weak GPUs). NEVER scale it with the island size â€” it's a light budget. */
export function GlowMushrooms3D({ reduced, lit = 3 }: { reduced: boolean; lit?: number }) {
  const spots = useMemo(place, []);
  const caps = useRef<(MeshStandardMaterial | null)[]>([]);
  const lights = useRef<(PointLight | null)[]>([]);

  useFrame((state) => {
    const boost = glowBoost(sky.dayness); // brighter at night
    const t = state.clock.elapsedTime;
    for (let i = 0; i < spots.length; i++) {
      // A faint per-mushroom breathing flicker (still under reduced-motion).
      const flicker = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 1.6 + i * 1.7);
      const cap = caps.current[i];
      if (cap) cap.emissiveIntensity = CAP_BASE * boost * flicker;
      const light = lights.current[i];
      if (light) light.intensity = LIGHT_BASE * boost * flicker;
    }
  });

  return (
    <group>
      {spots.map((m, i) => (
        <group key={i} position={[m.x, m.y, m.z]} scale={m.s}>
          <mesh position-y={0.09}>
            <cylinderGeometry args={[0.03, 0.05, 0.18, 5]} />
            <meshStandardMaterial color={0x5b4a3a} roughness={1} flatShading />
          </mesh>
          <mesh position-y={0.2}>
            <sphereGeometry args={[0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              ref={(el) => {
                caps.current[i] = el;
              }}
              color={m.color}
              emissive={m.color}
              emissiveIntensity={CAP_BASE}
              transparent
              opacity={0.9}
              flatShading
            />
          </mesh>
          {i < lit && (
            <pointLight
              ref={(el) => {
                lights.current[i] = el;
              }}
              color={m.color}
              intensity={LIGHT_BASE}
              distance={3}
              decay={2}
              position={[0, 0.25, 0]}
            />
          )}
        </group>
      ))}
    </group>
  );
}
