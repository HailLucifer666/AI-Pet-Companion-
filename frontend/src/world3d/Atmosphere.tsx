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

// Tuned for the high-diorama camera (rests ~46 out): the island reads clear with a
// hint of depth on its far rim, and the surrounding sea dissolves into the horizon.
const FOG_NEAR = 50;
const FOG_FAR = 120;
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
      dir.current.position.x += (base.sunDir[0] - dir.current.position.x) * k;
      dir.current.position.y += (base.sunDir[1] - dir.current.position.y) * k;
      dir.current.position.z += (base.sunDir[2] - dir.current.position.z) * k;
    }
    if (hemi.current) {
      hemi.current.color.lerp(skyTarget, k);
      hemi.current.intensity += (base.hemiIntensity * (1 - fx.dim * 0.5) - hemi.current.intensity) * k;
    }
    if (amb.current) {
      amb.current.color.lerp(tmpAmb.set(base.ambient), k);
      // Scale ambient with daylight so night sinks dark (≈0.22) and the emissive
      // crystals/pet/mushrooms own it; day fills to ≈0.62.
      const ambTarget = (0.22 + base.dayness * 0.4) * (1 - fx.dim * 0.4);
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
        position={[18, 18, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      {/* Cool back-rim — lifts the low-poly silhouettes out of the fog. */}
      <directionalLight ref={rim} color={WORLD.rim} intensity={0.55} position={[-14, 7, -16]} />
    </>
  );
}
