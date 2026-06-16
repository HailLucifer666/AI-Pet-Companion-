/** Places3D — diegetic navigation in the 3D Grove. Each Place is a low-poly
 *  landmark you can click (mouse via raycasting) plus a drei <Html> label that is
 *  a real, focusable DOM button (keyboard parity). Activating it opens that
 *  surface as an overlay over the world — the same worldNavStore + SurfaceOverlay
 *  the 2D version used. The rail still reaches every surface directly. */

import { useState } from "react";
import { Html } from "@react-three/drei";
import { useWorldNav } from "../state/worldNavStore";
import { useWorldStore } from "../state/worldStore";
import { cx } from "../components/ui";
import { WORLD } from "./palette";
import { PLACES_3D, type PlaceEntry as PlaceDef, type PlaceKind } from "./placeRegistry";

function Marker({ kind, hovered }: { kind: PlaceKind; hovered: boolean }) {
  // The Hollow's fire flares while a real tool runs (the companion is working).
  const working = useWorldStore((s) => s.lumen.mode === "work");
  if (kind === "hollow") {
    const hot = hovered || working;
    return (
      <group>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.4, 0.08, Math.sin(a) * 0.4]} castShadow>
              <dodecahedronGeometry args={[0.12, 0]} />
              <meshStandardMaterial color={WORLD.rock} flatShading roughness={1} />
            </mesh>
          );
        })}
        {/* crossed logs */}
        <mesh position-y={0.12} rotation={[Math.PI / 2, 0, 0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 5]} />
          <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
        </mesh>
        <mesh position-y={0.12} rotation={[Math.PI / 2, 0, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 5]} />
          <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
        </mesh>
        {/* flame — flares when hovered or while the companion works */}
        <mesh position-y={0.34} scale-y={hot ? 1.3 : 1}>
          <coneGeometry args={[0.2, 0.6, 5]} />
          <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={hot ? 2.8 : 1.5} flatShading />
        </mesh>
        <mesh position-y={0.5} scale-y={hot ? 1.3 : 1}>
          <coneGeometry args={[0.1, 0.3, 5]} />
          <meshStandardMaterial color={WORLD.emberHi} emissive={WORLD.emberHi} emissiveIntensity={hot ? 3.0 : 1.8} flatShading />
        </mesh>
        {/* the fire's light only when it matters — the emissive flame carries the cold state */}
        {hot && <pointLight color={WORLD.ember} intensity={7} distance={8} decay={2} position={[0, 0.5, 0]} />}
      </group>
    );
  }
  if (kind === "garden") {
    return (
      <group>
        {[-0.26, 0, 0.26].map((dx, i) => (
          <mesh key={i} position={[dx, 0.26 + (i === 1 ? 0.06 : 0), 0]} castShadow>
            <coneGeometry args={[0.12, 0.5, 5]} />
            <meshStandardMaterial color={WORLD.garden} emissive={WORLD.garden} emissiveIntensity={hovered ? 1.8 : 0.85} flatShading />
          </mesh>
        ))}
      </group>
    );
  }
  // workbench
  return (
    <group>
      <mesh position-y={0.26} castShadow>
        <boxGeometry args={[0.72, 0.12, 0.42]} />
        <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
      </mesh>
      {[
        [-0.3, -0.16],
        [0.3, -0.16],
        [-0.3, 0.16],
        [0.3, 0.16],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]}>
          <boxGeometry args={[0.07, 0.22, 0.07]} />
          <meshStandardMaterial color={WORLD.trunk} flatShading roughness={1} />
        </mesh>
      ))}
      <mesh position-y={0.46} castShadow>
        <icosahedronGeometry args={[0.13, 0]} />
        <meshStandardMaterial color={WORLD.ember} emissive={WORLD.ember} emissiveIntensity={hovered ? 1.8 : 0.7} flatShading />
      </mesh>
    </group>
  );
}

function Place({ place }: { place: PlaceDef }) {
  const open = useWorldNav((s) => s.openSurface);
  const [hovered, setHovered] = useState(false);

  const enter = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const leave = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  return (
    <group
      position={place.pos}
      onPointerOver={enter}
      onPointerOut={leave}
      onClick={(e) => {
        e.stopPropagation();
        open(place.route);
      }}
    >
      <Marker kind={place.kind} hovered={hovered} />
      <Html position={[0, 1.15, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
        <button
          onClick={() => open(place.route)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-label={`${place.label} — ${place.sub}`}
          className={cx(
            "whitespace-nowrap rounded-full border px-2.5 py-1 font-display text-xs font-medium transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-claw-400",
            hovered
              ? "border-claw-400 bg-claw-600/30 text-ink-100"
              : "border-claw-500/40 bg-ink-950/70 text-ink-300",
          )}
        >
          {place.label}
        </button>
      </Html>
    </group>
  );
}

export function Places3D() {
  return (
    <group>
      {PLACES_3D.map((p) => (
        <Place key={p.id} place={p} />
      ))}
    </group>
  );
}
