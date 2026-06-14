/** Village3D — the bioluminescent medieval hamlet that IS the world: a cobblestone
 *  plaza with a hearth/bonfire (the pet's home), three procedural buildings around
 *  it (tavern=Hollow, forge=Workbench, greenhouse=Garden), and cobble roads spoking
 *  out to each. Dusk-recolored stone/timber/roofs (VILLAGE tokens) carry the dark;
 *  every window, lantern, glass pane and the hearth GLOWS in WORLD.ember/garden —
 *  the same emissive vocabulary as the pet, crystals and mushrooms, blooming via the
 *  shared `glowBoost(sky.dayness)` grade. Buildings are hand-built primitives (no
 *  GLBs in the first cut). One glow `useFrame`; ≤4 point lights. Real data only: the
 *  forge ember flares while a tool runs (`lumen.mode==='work'`), the hearth brightens
 *  while the pet is home. Reduced-motion: present and lit, no flicker. */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { glowBoost } from "./daylight";
import { sky } from "./skyState";
import { WORLD, VILLAGE } from "./palette";
import { PLAZA_POS } from "./placeDefs";
import { BUILDING_DEFS, VILLAGE_ROADS, type BuildingDef } from "./villageLayout";
import { buildRoadGeometry } from "./roadGraph";

const hex = (n: number) => new THREE.Color(n);

/** Tag a material as glow-driven: store its base emissive intensity + optional
 *  per-frame behaviours read by the single glow `useFrame` (traversal). */
function glow(
  mat: THREE.MeshStandardMaterial,
  base: number,
  opts: { flicker?: number; workFlare?: number } = {},
): THREE.MeshStandardMaterial {
  mat.userData.emissiveBase = base;
  if (opts.flicker !== undefined) mat.userData.flicker = opts.flicker;
  if (opts.workFlare !== undefined) mat.userData.workFlare = opts.workFlare;
  return mat;
}

/** All shared procedural materials, built once. The emissive ones are tagged via
 *  `glow()` so the traversal animates them; the matte ones just read dark. */
function useVillageMaterials() {
  const mats = useMemo(() => {
    const stone = new THREE.MeshStandardMaterial({ color: hex(VILLAGE.stoneDark), roughness: 1, flatShading: true });
    const stoneHi = new THREE.MeshStandardMaterial({ color: hex(VILLAGE.stoneHi), roughness: 1, flatShading: true });
    const timber = new THREE.MeshStandardMaterial({ color: hex(VILLAGE.timberDark), roughness: 1, flatShading: true });
    const roof = new THREE.MeshStandardMaterial({ color: hex(VILLAGE.roofDark), roughness: 1, flatShading: true });
    const cobble = new THREE.MeshStandardMaterial({ color: hex(VILLAGE.plazaCobble), roughness: 1, flatShading: true });
    const road = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
    const window = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.ember), emissive: hex(WORLD.ember) }),
      1.1,
      { flicker: 0.7 },
    );
    const workWindow = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.botEye), emissive: hex(WORLD.botEye) }),
      0.8,
      { workFlare: 2.4 },
    );
    const lantern = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.emberHi), emissive: hex(WORLD.emberHi) }),
      1.8,
      { flicker: 1.9 },
    );
    const glass = glow(
      new THREE.MeshStandardMaterial({
        color: hex(WORLD.garden),
        emissive: hex(WORLD.garden),
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.4,
      }),
      0.55,
    );
    const crystal = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.garden), emissive: hex(WORLD.garden), flatShading: true }),
      1.1,
      { flicker: 3.1 },
    );
    const forgeTop = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.ember), emissive: hex(WORLD.ember), flatShading: true }),
      0.6,
      { workFlare: 3.2 },
    );
    // Campfire: a warm orange flame body (not blown-white) + a small bright core.
    const flame = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.ember), emissive: hex(WORLD.ember), flatShading: true }),
      0.85,
      { flicker: 0.3 },
    );
    const flameTip = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.emberHi), emissive: hex(WORLD.emberHi), flatShading: true }),
      1.25,
      { flicker: 1.1 },
    );
    return { stone, stoneHi, timber, roof, cobble, road, window, workWindow, lantern, glass, crystal, forgeTop, flame, flameTip };
  }, []);

  useEffect(
    () => () => Object.values(mats).forEach((m) => m.dispose()),
    [mats],
  );
  return mats;
}

type Mats = ReturnType<typeof useVillageMaterials>;

/** A small ember lantern on a thin post. */
function Lantern({ mats, x, z, h = 1.0 }: { mats: Mats; x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={h / 2} castShadow>
        <cylinderGeometry args={[0.04, 0.05, h, 5]} />
        <primitive object={mats.timber} attach="material" />
      </mesh>
      <mesh position-y={h + 0.1}>
        <icosahedronGeometry args={[0.14, 0]} />
        <primitive object={mats.lantern} attach="material" />
      </mesh>
    </group>
  );
}

/** A lantern post planted on the terrain at world (x, z). */
function GroundLantern({ mats, x, z, h = 1.1 }: { mats: Mats; x: number; z: number; h?: number }) {
  const y = islandHeight(x, z, ISLAND_MAX_R);
  return (
    <group position={[x, y, z]}>
      <Lantern mats={mats} x={0} z={0} h={h} />
    </group>
  );
}

/** Tavern (Hollow): timber box, peaked roof, stone chimney, two ember windows, a
 *  door lantern. */
function Tavern({ mats }: { mats: Mats }) {
  return (
    <group>
      <mesh position-y={0.85} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.7, 2.0]} />
        <primitive object={mats.timber} attach="material" />
      </mesh>
      {/* peaked two-panel roof */}
      <mesh position-y={2.05} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[2.05, 1.1, 4]} />
        <primitive object={mats.roof} attach="material" />
      </mesh>
      {/* stone chimney */}
      <mesh position={[0.9, 2.0, -0.6]} castShadow>
        <boxGeometry args={[0.4, 1.4, 0.4]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      {/* ember windows (face the plaza, +Z after building rotation) */}
      <mesh position={[-0.6, 0.95, 1.01]}>
        <boxGeometry args={[0.5, 0.6, 0.06]} />
        <primitive object={mats.window} attach="material" />
      </mesh>
      <mesh position={[0.6, 0.95, 1.01]}>
        <boxGeometry args={[0.5, 0.6, 0.06]} />
        <primitive object={mats.window} attach="material" />
      </mesh>
      <Lantern mats={mats} x={1.0} z={1.1} h={1.3} />
    </group>
  );
}

/** Forge/workshop (Workbench): stocky stone base + timber upper, a tall forge
 *  chimney whose ember top flares on `work`, a cyan work window, an anvil. */
function Forge({ mats }: { mats: Mats }) {
  return (
    <group>
      <mesh position-y={0.6} castShadow receiveShadow>
        <boxGeometry args={[2.4, 1.2, 2.2]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      <mesh position-y={1.55} castShadow>
        <boxGeometry args={[2.2, 0.8, 2.0]} />
        <primitive object={mats.timber} attach="material" />
      </mesh>
      <mesh position-y={2.15} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[1.85, 0.8, 4]} />
        <primitive object={mats.roof} attach="material" />
      </mesh>
      {/* forge chimney + glowing ember crown */}
      <mesh position={[-0.85, 2.0, -0.5]} castShadow>
        <boxGeometry args={[0.5, 1.8, 0.5]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      <mesh position={[-0.85, 2.95, -0.5]}>
        <boxGeometry args={[0.42, 0.22, 0.42]} />
        <primitive object={mats.forgeTop} attach="material" />
      </mesh>
      {/* cyan work window */}
      <mesh position={[0.4, 0.85, 1.11]}>
        <boxGeometry args={[0.9, 0.7, 0.06]} />
        <primitive object={mats.workWindow} attach="material" />
      </mesh>
      {/* anvil */}
      <mesh position={[0.0, 0.35, 1.5]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.24]} />
        <primitive object={mats.stoneHi} attach="material" />
      </mesh>
      <Lantern mats={mats} x={1.1} z={1.2} h={1.2} />
    </group>
  );
}

/** Greenhouse/shrine (Garden): a 6-sided translucent garden-glass prism on a stone
 *  ring, a peaked translucent cap, an interior glowing crystal cluster. */
function Greenhouse({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* stone ring base */}
      <mesh position-y={0.25} castShadow receiveShadow>
        <cylinderGeometry args={[1.35, 1.45, 0.5, 6]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      {/* glass prism */}
      <mesh position-y={1.35} castShadow>
        <cylinderGeometry args={[1.2, 1.25, 1.8, 6, 1, true]} />
        <primitive object={mats.glass} attach="material" />
      </mesh>
      {/* peaked translucent cap */}
      <mesh position-y={2.6}>
        <coneGeometry args={[1.32, 0.9, 6]} />
        <primitive object={mats.glass} attach="material" />
      </mesh>
      {/* interior crystal cluster */}
      <mesh position-y={1.1} rotation-y={0.4}>
        <octahedronGeometry args={[0.55, 0]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
      <mesh position={[0.4, 0.85, 0.3]} rotation-y={0.9}>
        <octahedronGeometry args={[0.34, 0]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
    </group>
  );
}

function Building({ def, mats }: { def: BuildingDef; mats: Mats }) {
  const Body = def.kind === "tavern" ? Tavern : def.kind === "workshop" ? Forge : Greenhouse;
  return (
    <group position={[def.pos[0], def.pos[1] - 0.1, def.pos[2]]} rotation-y={def.rotationY}>
      <Body mats={mats} />
    </group>
  );
}

/** A campfire: a stone fire-ring, a small stack of logs, and warm layered flames
 *  with a bright core (reads as fire, not a white pyramid). `y0` = ground height. */
function Campfire({ mats, y0 }: { mats: Mats; y0: number }) {
  return (
    <group position-y={y0}>
      {/* stone fire-ring */}
      <mesh position-y={0.18} castShadow>
        <cylinderGeometry args={[0.85, 0.95, 0.36, 9]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      {/* crossed logs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position-y={0.34} rotation={[Math.PI / 2, 0, (i / 3) * Math.PI]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 1.3, 6]} />
          <primitive object={mats.timber} attach="material" />
        </mesh>
      ))}
      {/* layered warm flames — three small cones + a bright inner core */}
      <mesh position={[0.12, 0.62, 0.06]}>
        <coneGeometry args={[0.32, 0.7, 6]} />
        <primitive object={mats.flame} attach="material" />
      </mesh>
      <mesh position={[-0.14, 0.56, -0.08]}>
        <coneGeometry args={[0.26, 0.56, 6]} />
        <primitive object={mats.flame} attach="material" />
      </mesh>
      <mesh position={[0.0, 0.82, 0.0]}>
        <coneGeometry args={[0.16, 0.48, 6]} />
        <primitive object={mats.flameTip} attach="material" />
      </mesh>
    </group>
  );
}

/** A little stone wishing-well with a timber post + plank roof. */
function Well({ mats }: { mats: Mats }) {
  return (
    <group>
      <mesh position-y={0.4} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.75, 0.8, 10]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      <mesh position={[-0.55, 1.2, 0]} castShadow>
        <boxGeometry args={[0.12, 1.5, 0.12]} />
        <primitive object={mats.timber} attach="material" />
      </mesh>
      <mesh position={[0.55, 1.2, 0]} castShadow>
        <boxGeometry args={[0.12, 1.5, 0.12]} />
        <primitive object={mats.timber} attach="material" />
      </mesh>
      <mesh position-y={1.95} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[0.95, 0.5, 4]} />
        <primitive object={mats.roof} attach="material" />
      </mesh>
    </group>
  );
}

/** The plaza: cobble disc, central campfire, a well + a few crates, lantern ring. */
function Plaza({ mats }: { mats: Mats }) {
  const [px, py, pz] = PLAZA_POS;
  const crates: [number, number, number][] = [
    [3.0, 0.35, -2.6],
    [3.5, 0.35, -2.0],
    [3.1, 1.0, -2.3],
  ];
  return (
    <group position={[px, 0, pz]}>
      <mesh rotation-x={-Math.PI / 2} position-y={py + 0.06} receiveShadow>
        <circleGeometry args={[5.2, 32]} />
        <primitive object={mats.cobble} attach="material" />
      </mesh>

      <Campfire mats={mats} y0={py} />

      {/* a well off to one side */}
      <group position={[-3.2, py, 2.4]}>
        <Well mats={mats} />
      </group>

      {/* a small stack of crates */}
      {crates.map((c, i) => (
        <mesh key={i} position={[c[0], py + c[1], c[2]]} rotation-y={i * 0.5} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <primitive object={mats.timber} attach="material" />
        </mesh>
      ))}

      {/* a ring of lanterns around the plaza edge (raised onto the cobble) */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const lx = Math.cos(a) * 4.6,
          lz = Math.sin(a) * 4.6;
        return (
          <group key={i} position={[lx, py, lz]}>
            <Lantern mats={mats} x={0} z={0} h={1.2} />
          </group>
        );
      })}
    </group>
  );
}

function Roads({ mats }: { mats: Mats }) {
  const geoms = useMemo(
    () =>
      VILLAGE_ROADS.map((r) => {
        const d = buildRoadGeometry(r);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.BufferAttribute(d.positions, 3));
        g.setAttribute("normal", new THREE.BufferAttribute(d.normals, 3));
        g.setAttribute("color", new THREE.BufferAttribute(d.colors, 3));
        g.setIndex(new THREE.BufferAttribute(d.index, 1));
        return g;
      }),
    [],
  );
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms]);

  // Lantern posts flanking each road at intervals (alternating sides) so the
  // cobble ways read as lit paths leading out from the plaza.
  const lanterns = useMemo(() => {
    const spots: { x: number; z: number }[] = [];
    for (const r of VILLAGE_ROADS) {
      const dx = r.toX - r.fromX,
        dz = r.toZ - r.fromZ,
        len = Math.hypot(dx, dz);
      const nx = dz / len,
        nz = -dx / len,
        off = r.width / 2 + 0.7;
      const count = Math.max(2, Math.floor(len / 10)); // sparser — lit path, not a runway
      for (let i = 1; i < count; i++) {
        const t = i / count,
          cx = r.fromX + dx * t,
          cz = r.fromZ + dz * t,
          side = i % 2 ? 1 : -1;
        spots.push({ x: cx + nx * off * side, z: cz + nz * off * side });
      }
    }
    return spots;
  }, []);

  return (
    <>
      {geoms.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <primitive object={mats.road} attach="material" />
        </mesh>
      ))}
      {lanterns.map((s, i) => (
        <GroundLantern key={`l${i}`} mats={mats} x={s.x} z={s.z} />
      ))}
    </>
  );
}

export function Village3D({ reduced }: { reduced: boolean }) {
  const mats = useVillageMaterials();
  const root = useRef<THREE.Group>(null);
  const hearthLight = useRef<THREE.PointLight>(null);
  const forgeLight = useRef<THREE.PointLight>(null);

  const tavern = BUILDING_DEFS.find((b) => b.kind === "tavern");
  const forge = BUILDING_DEFS.find((b) => b.kind === "workshop");
  const greenhouse = BUILDING_DEFS.find((b) => b.kind === "greenhouse");
  const [px, py, pz] = PLAZA_POS;
  const forgeH = forge ? islandHeight(forge.pos[0], forge.pos[2], ISLAND_MAX_R) + 1.6 : 0;

  useFrame((state) => {
    const boost = glowBoost(sky.dayness);
    const { lumen } = useWorldStore.getState();
    const working = lumen.mode === "work";
    const atHome = lumen.place === "home";
    const t = state.clock.elapsedTime;

    root.current?.traverse((o) => {
      const raw = (o as THREE.Mesh).material;
      if (!raw || Array.isArray(raw)) return;
      const m = raw as THREE.MeshStandardMaterial;
      const base = m.userData.emissiveBase as number | undefined;
      if (base === undefined) return;
      let mult = boost;
      if (m.userData.workFlare !== undefined) mult *= working ? (m.userData.workFlare as number) : 1;
      if (!reduced && m.userData.flicker !== undefined) {
        mult *= 0.88 + 0.12 * Math.sin(t * 1.4 + (m.userData.flicker as number));
      }
      m.emissiveIntensity = base * mult;
    });

    // Hearth + forge lights ride the same grade (+ a hearth flicker, work flare).
    const flick = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 5);
    if (hearthLight.current) hearthLight.current.intensity = (atHome ? 9 : 5) * boost * flick;
    if (forgeLight.current) forgeLight.current.intensity = (working ? 5 : 2.2) * boost;
  });

  return (
    <group ref={root}>
      <Plaza mats={mats} />
      <Roads mats={mats} />
      {BUILDING_DEFS.map((b) => (
        <Building key={b.id} def={b} mats={mats} />
      ))}

      {/* ≤4 point lights — the bioluminescent ground bounce (capped for perf). */}
      <pointLight ref={hearthLight} position={[px, py + 0.9, pz]} color={hex(WORLD.ember)} intensity={5} distance={12} decay={2} />
      {forge && (
        <pointLight ref={forgeLight} position={[forge.pos[0], forgeH, forge.pos[2]]} color={hex(WORLD.ember)} intensity={2.2} distance={6} decay={2} />
      )}
      {tavern && (
        <pointLight position={[tavern.pos[0], islandHeight(tavern.pos[0], tavern.pos[2], ISLAND_MAX_R) + 1.2, tavern.pos[2]]} color={hex(WORLD.ember)} intensity={2.8} distance={7} decay={2} />
      )}
      {greenhouse && (
        <pointLight position={[greenhouse.pos[0], islandHeight(greenhouse.pos[0], greenhouse.pos[2], ISLAND_MAX_R) + 1.4, greenhouse.pos[2]]} color={hex(WORLD.garden)} intensity={1.8} distance={5} decay={2} />
      )}
    </group>
  );
}
