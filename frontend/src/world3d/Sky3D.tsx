/** Sky3D — the visible sun and moon. Two emissive spheres (a sphere with an unlit,
 *  bloom-bright material reads as a glowing disc from any camera angle) placed along
 *  the live day/night light direction at a fixed CAMERA-RELATIVE distance, so they
 *  feel infinitely far (no parallax) and never clip the far plane. `fog={false}` keeps
 *  them crisp above the weather haze; `toneMapped={false}` + emissive lets the world's
 *  Bloom glow them. Sun fades in by day, moon by night (crossfade at twilight). The
 *  same `hour` clock + `daylightAt` that drives Atmosphere drives the body's arc. */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { daylightAt } from "./daylight";
import { celestialPlacement } from "./celestial";
import { WORLD } from "./palette";

const SUN_R = 17; // disc radius at SKY_DIST (live-tune the apparent size)
const MOON_R = 13;
const HALO = 2.0; // soft halo behind each body
const hex = (n: number) => new THREE.Color(n);

export function Sky3D({ hour, reduced }: { hour: number; reduced: boolean }) {
  const camera = useThree((s) => s.camera);
  const sun = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Group>(null);
  const sunMat = useRef<THREE.MeshBasicMaterial>(null);
  const sunHalo = useRef<THREE.MeshBasicMaterial>(null);
  const moonMat = useRef<THREE.MeshBasicMaterial>(null);
  const moonHalo = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const { sunDir, dayness } = daylightAt(hour);
    const { offset, sunOpacity, moonOpacity } = celestialPlacement(sunDir, dayness);
    const cx = camera.position.x + offset[0];
    const cy = camera.position.y + offset[1];
    const cz = camera.position.z + offset[2];
    sun.current?.position.set(cx, cy, cz);
    moon.current?.position.set(cx, cy, cz);
    if (sunMat.current) sunMat.current.opacity = sunOpacity;
    if (sunHalo.current) sunHalo.current.opacity = sunOpacity * 0.32;
    if (moonMat.current) moonMat.current.opacity = moonOpacity;
    if (moonHalo.current) moonHalo.current.opacity = moonOpacity * 0.26;
  });

  // reduced-motion is handled by the demand frameloop (one frame per re-render on the
  // minute clock) — the body simply sits at the current hour's position, no easing.
  void reduced;

  return (
    <>
      <group ref={sun}>
        <mesh>
          <sphereGeometry args={[SUN_R, 24, 24]} />
          <meshBasicMaterial ref={sunMat} color={hex(WORLD.emberHi)} transparent fog={false} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[SUN_R * HALO, 20, 20]} />
          <meshBasicMaterial ref={sunHalo} color={hex(WORLD.sun)} transparent depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
      </group>
      <group ref={moon}>
        <mesh>
          <sphereGeometry args={[MOON_R, 24, 24]} />
          <meshBasicMaterial ref={moonMat} color={hex(WORLD.moon)} transparent fog={false} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[MOON_R * HALO, 20, 20]} />
          <meshBasicMaterial ref={moonHalo} color={hex(WORLD.moon)} transparent depthWrite={false} fog={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}
