/** Particles3D — ambient light-motes drifting over the Grove. A single additive
 *  Points cloud (one draw call) whose motion comes from the pure `flow` field, so
 *  the air always reads as gently alive — the biggest cheap "vibrant" win, lifted
 *  in spirit from low-poly worlds like Gravity Garden but coloured by OUR tokens
 *  (warm ember + a cool accent). Reduced-motion → the motes are present but still.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import { makeField, motePosition } from "./particles/flow";
import { WORLD } from "./palette";
import { WORLD_SCALE } from "./terrain";

const COUNT = 600; // more motes spread over the bigger island (cheap Points — still one draw call)
const FIELD_R = 13 * WORLD_SCALE;

export function Particles3D() {
  const reduced = useReducedMotion() ?? false;
  const points = useRef<THREE.Points>(null);

  const { geom, field } = useMemo(() => {
    const field = makeField(COUNT, 0x6c10, FIELD_R);
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const warm = new THREE.Color(WORLD.emberHi);
    const cool = new THREE.Color(WORLD.mote);
    const tmp = { x: 0, y: 0, z: 0 };
    field.motes.forEach((m, i) => {
      motePosition(m, 0, tmp);
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;
      const c = i % 3 === 0 ? cool : warm; // ~1/3 cool, 2/3 warm
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geom, field };
  }, []);

  useEffect(() => () => geom.dispose(), [geom]);

  useFrame((state) => {
    if (reduced || !points.current) return;
    const t = state.clock.elapsedTime;
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const tmp = { x: 0, y: 0, z: 0 };
    field.motes.forEach((m, i) => {
      motePosition(m, t, tmp);
      arr[i * 3] = tmp.x;
      arr[i * 3 + 1] = tmp.y;
      arr[i * 3 + 2] = tmp.z;
    });
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        size={0.09}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
        fog={false}
      />
    </points>
  );
}
