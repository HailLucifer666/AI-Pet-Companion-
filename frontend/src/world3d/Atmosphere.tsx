/** Atmosphere — the Grove's sky + light, driven by the real clock (day/night) and
 *  real weather. It owns scene.background + fog and the scene lights, and each
 *  frame eases them toward the target from `daylightAt(hour)` blended with the
 *  weather flags (clouds grey the sky, rain/overcast dim the sun, fog draws in).
 *  Reduced-motion snaps (no easing). Mounted inside the Canvas. */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Fog } from "three";
import type { AmbientLight, DirectionalLight, HemisphereLight } from "three";
import { daylightAt } from "./daylight";
import { sky } from "./skyState";
import type { WeatherFx } from "./weather";
import { WORLD } from "./palette";
import { ISLAND_MAX_R, WORLD_SCALE } from "./terrain";

// Tuned for the close explorable camera on the big island: a hazy horizon that
// dissolves the far world into mist (reinforcing "more world beyond"), rather than
// showing the whole island crisply. Sea (radius ~1120) sits well past the fog.
const FOG_NEAR = 80;
const FOG_FAR = 300;
const SHADOW_R = ISLAND_MAX_R; // ortho shadow frustum covers the whole island
const OVERCAST = new Color(0x7a8290);

// Reused work colors (a single Atmosphere instance lives per canvas).
const skyTarget = new Color();
const tmpSun = new Color();
const tmpAmb = new Color();

export function Atmosphere({ hour, fx, reduced }: { hour: number; fx: WeatherFx; reduced: boolean }) {
  const scene = useThree((s) => s.scene);
  const dir = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const amb = useRef<AmbientLight>(null);
  const rim = useRef<DirectionalLight>(null);

  useEffect(() => {
    scene.background = new Color(WORLD.sky);
    scene.fog = new Fog(WORLD.fog, FOG_NEAR, FOG_FAR);
  }, [scene]);

  useFrame((_, delta) => {
    const base = daylightAt(hour);
    sky.dayness = base.dayness; // shared with the glowing things (pet/crystals/mushrooms)
    const k = reduced ? 1 : 1 - Math.exp(-1.5 * delta);

    // Cloud cover greys the sky — but deep night stays dark (scale by dayness).
    const greyAmt = fx.clouds * 0.45 * (0.3 + base.dayness * 0.7);
    skyTarget.set(base.sky).lerp(OVERCAST, greyAmt);

    const bg = scene.background;
    if (bg instanceof Color) bg.lerp(skyTarget, k);
    const fog = scene.fog;
    if (fog instanceof Fog) {
      fog.color.lerp(skyTarget, k);
      fog.near += (FOG_NEAR * fx.fogScale - fog.near) * k;
      fog.far += (FOG_FAR * fx.fogScale - fog.far) * k;
    }

    if (dir.current) {
      dir.current.color.lerp(tmpSun.set(base.sun), k);
      dir.current.intensity += (base.sunIntensity * (1 - fx.dim) - dir.current.intensity) * k;
      // Push the sun out beyond the (now big) island so its ortho shadow camera sees
      // the whole island in front of it — the light DIRECTION is unchanged.
      dir.current.position.x += (base.sunDir[0] * WORLD_SCALE - dir.current.position.x) * k;
      dir.current.position.y += (base.sunDir[1] * WORLD_SCALE - dir.current.position.y) * k;
      dir.current.position.z += (base.sunDir[2] * WORLD_SCALE - dir.current.position.z) * k;
    }
    if (hemi.current) {
      hemi.current.color.lerp(skyTarget, k);
      hemi.current.intensity += (base.hemiIntensity * (1 - fx.dim * 0.5) - hemi.current.intensity) * k;
    }
    if (amb.current) {
      amb.current.color.lerp(tmpAmb.set(base.ambient), k);
      // Scale ambient with daylight so night stays moody (≈0.30 — lifted a touch so
      // shapes read clean, not muddy) while the emissive crystals/pet/mushrooms still
      // own it; day fills to ≈0.64.
      const ambTarget = (0.3 + base.dayness * 0.34) * (1 - fx.dim * 0.4);
      amb.current.intensity += (ambTarget - amb.current.intensity) * k;
    }
    if (rim.current) {
      rim.current.intensity += (0.55 * (1 - fx.dim * 0.3) - rim.current.intensity) * k;
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} color={WORLD.sky} groundColor={0x232a1c} intensity={0.85} />
      <ambientLight ref={amb} color={WORLD.ambient} intensity={0.5} />
      <directionalLight
        ref={dir}
        color={WORLD.sun}
        intensity={1.45}
        position={[18 * WORLD_SCALE, 18 * WORLD_SCALE, 10 * WORLD_SCALE]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-SHADOW_R}
        shadow-camera-right={SHADOW_R}
        shadow-camera-top={SHADOW_R}
        shadow-camera-bottom={-SHADOW_R}
        shadow-camera-near={1}
        shadow-camera-far={SHADOW_R * 6}
        shadow-bias={-0.0002}
      />
      {/* Cool back-rim — lifts the low-poly silhouettes out of the fog. */}
      <directionalLight ref={rim} color={WORLD.rim} intensity={0.55} position={[-14, 7, -16]} />
    </>
  );
}
