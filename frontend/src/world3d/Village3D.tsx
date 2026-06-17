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
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { useWorldStore } from "../state/worldStore";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { glowBoost } from "./daylight";
import { bloomFlash } from "./bloomCinematic";
import { sky } from "./skyState";
import { WORLD, VILLAGE } from "./palette";
import { PLAZA_POS } from "./placeRegistry";
import { BUILDING_DEFS, VILLAGE_ROADS, type BuildingDef } from "./villageLayout";
import { buildRoadGeometry } from "./roadGraph";
import { skillMonumentPosition } from "./skillMonumentPlacement";
import type { Skill } from "../lib/api";

const hex = (n: number) => new THREE.Color(n);
const FORGE_MS = 1600; // how long the forge erupts after a real skill draft
const nowMs = () => (typeof performance !== "undefined" ? performance.now() : 0);

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
    // Earned skill monuments: a steady ember glow (no flicker) — calm, not busy.
    const skillGlow = glow(
      new THREE.MeshStandardMaterial({ color: hex(WORLD.ember), emissive: hex(WORLD.ember), flatShading: true }),
      0.9,
    );
    return { stone, stoneHi, timber, roof, cobble, road, window, workWindow, lantern, glass, crystal, forgeTop, flame, flameTip, skillGlow };
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

/** Loads a Quaternius GLB, parses its materials by name, and intercepts them with
 *  the dynamic bioluminescent CSS materials generated by useVillageMaterials. */
function BuildingGLTF({ url, mats, scale = 1, rotY = 0 }: { url: string; mats: Mats; scale?: number; rotY?: number }) {
  const gltf = useLoader(GLTFLoader, url);
  
  const clone = useMemo(() => {
    // We clone because multiple buildings could share a mesh if we duplicate them
    const c = gltf.scene.clone();
    c.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const matName = o.material?.name || "";
        
        if (matName.includes("Wood")) o.material = mats.timber;
        else if (matName.includes("Stone_Dark")) o.material = mats.stone;
        else if (matName.includes("Stone_Light") || matName.includes("Plaster")) o.material = mats.stoneHi;
        else if (matName.includes("Roof")) o.material = mats.roof;
        else if (matName.includes("Window")) o.material = mats.window;
        else if (matName.includes("Fire")) o.material = mats.flame;
        else o.material = mats.stone; // default fallback
      }
    });
    return c;
  }, [gltf, mats]);

  return <primitive object={clone} scale={scale} rotation-y={rotY} />;
}

/** Tavern (Hollow): Uses Tavern.glb */
function Tavern({ mats }: { mats: Mats }) {
  return (
    <group>
      <BuildingGLTF url="/models/village/Tavern.glb" mats={mats} scale={0.7} rotY={-Math.PI / 2} />
      <Lantern mats={mats} x={1.2} z={1.4} h={1.3} />
    </group>
  );
}

/** Forge/workshop: Uses Forge.glb */
function Forge({ mats }: { mats: Mats }) {
  return (
    <group>
      <BuildingGLTF url="/models/village/Forge.glb" mats={mats} scale={0.7} rotY={-Math.PI / 2} />
      
      {/* Invisible proxy mesh for the forge eruption effect. The real chimney is
          now baked into the GLB, so we just place a glowing tip near where it sits. */}
      <mesh position={[-0.8, 3.2, -0.2]}>
        <boxGeometry args={[0.42, 0.22, 0.42]} />
        <primitive object={mats.forgeTop} attach="material" />
      </mesh>
      
      {/* cyan work window proxy (since the default forge windows might not map well) */}
      <mesh position={[0.2, 0.85, 1.3]}>
        <boxGeometry args={[0.9, 0.7, 0.06]} />
        <primitive object={mats.workWindow} attach="material" />
      </mesh>

      {/* Floating data plates / cyan seams around the workbench */}
      <mesh position={[0.7, 0.7, 1.4]} rotation-x={-0.1} rotation-y={-0.2}>
        <planeGeometry args={[0.35, 0.2]} />
        <primitive object={mats.workWindow} attach="material" />
      </mesh>
      <mesh position={[-0.3, 0.5, 1.4]} rotation-x={-0.1} rotation-y={0.2}>
        <planeGeometry args={[0.25, 0.15]} />
        <primitive object={mats.workWindow} attach="material" />
      </mesh>
      {/* Tech seam glowing on the stone base */}
      <mesh position={[0.2, 0.15, 1.3]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.2, 0.05]} />
        <primitive object={mats.workWindow} attach="material" />
      </mesh>
      
      <Lantern mats={mats} x={1.3} z={1.5} h={1.2} />
    </group>
  );
}

/** Greenhouse/shrine (Garden): Uses Greenhouse.glb (Mill) */
function Greenhouse({ mats }: { mats: Mats }) {
  return (
    <group>
      <BuildingGLTF url="/models/village/Greenhouse.glb" mats={mats} scale={0.65} rotY={0} />
      
      {/* interior crystal cluster proxy to maintain the magical look */}
      <mesh position-y={1.1} rotation-y={0.4}>
        <octahedronGeometry args={[0.55, 0]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
    </group>
  );
}

function TasksWell({ mats }: { mats: Mats }) {
  return (
    <group>
      <BuildingGLTF url="/models/village/Well.glb" mats={mats} scale={1.2} />
      {/* Floating ember crystal for the tasks */ }
      <mesh position-y={1.8} castShadow>
        <octahedronGeometry args={[0.15, 0]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
    </group>
  );
}

function CalendarStone({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Tall stone obelisk */}
      <mesh position-y={1.5} castShadow>
        <boxGeometry args={[0.6, 3.0, 0.6]} />
        <primitive object={mats.stone} attach="material" />
      </mesh>
      {/* Glowing ring/clock at the top */}
      <mesh position-y={3.2} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.3, 0.05, 8, 24]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
    </group>
  );
}

function Archives({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Mill.glb is used as a placeholder for the Archives */}
      <BuildingGLTF url="/models/village/Mill.glb" mats={mats} scale={0.7} rotY={0} />
      
      {/* A small glowing crystal above the door to signify knowledge */}
      <mesh position-y={1.8} position-x={-0.2} position-z={1.2}>
        <octahedronGeometry args={[0.2, 0]} />
        <primitive object={mats.crystal} attach="material" />
      </mesh>
      <Lantern mats={mats} x={1.2} z={1.4} h={1.3} />
    </group>
  );
}

function Building({ def, mats }: { def: BuildingDef; mats: Mats }) {
  const Body =
    def.kind === "tavern"
      ? Tavern
      : def.kind === "workshop"
      ? Forge
      : def.kind === "archives"
      ? Archives
      : def.kind === "tasks"
      ? TasksWell
      : def.kind === "calendar"
      ? CalendarStone
      : Greenhouse;
      
  return (
    <group position={[def.pos[0], def.pos[1] - 0.1, def.pos[2]]} rotation-y={def.rotationY}>
      <Body mats={mats} />
    </group>
  );
}

function Campfire({ mats, y0 }: { mats: Mats; y0: number }) {
  return (
    <group position-y={y0}>
      <BuildingGLTF url="/models/village/Bonfire_Lit.glb" mats={mats} scale={1.0} />
      {/* Ember rim — a warm glowing ring marking the hollow's boundary */}
      <mesh position-y={0.06} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 0.95, 24]} />
        <primitive object={mats.flame} attach="material" />
      </mesh>
    </group>
  );
}

function Well({ mats }: { mats: Mats }) {
  return (
    <group>
      <BuildingGLTF url="/models/village/Well.glb" mats={mats} scale={1.0} />
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

/** Earned monuments: one small glowing obelisk per APPROVED skill, ringing the
 *  forge. Real-data — fed by the live active-skills list (useSkills, passed in).
 *  Mounted inside the Village root group, so the shared glow traversal lights its
 *  ember caps at zero extra per-frame cost. No own point light (the ≤4 cap holds). */
function SkillMonuments({ mats, skills, forgeX, forgeZ }: { mats: Mats; skills: Skill[]; forgeX: number; forgeZ: number }) {
  return (
    <group>
      {skills.map((s, i) => {
        const p = skillMonumentPosition(i, s.id, forgeX, forgeZ);
        return (
          <group key={s.id} position={[p.x, p.y, p.z]}>
            <mesh position-y={0.25} castShadow receiveShadow>
              <boxGeometry args={[0.34, 0.5, 0.34]} />
              <primitive object={mats.stone} attach="material" />
            </mesh>
            <mesh position-y={0.66}>
              <icosahedronGeometry args={[0.17, 0]} />
              <primitive object={mats.skillGlow} attach="material" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Village3D({ reduced, skills }: { reduced: boolean; skills: Skill[] }) {
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
    const { lumen, forgeAt } = useWorldStore.getState();
    const working = lumen.mode === "work";
    const atHome = lumen.place === "hollow";
    const t = state.clock.elapsedTime;
    // The Forging: a cubic-out eruption of the forge on a real skill draft.
    const forgeFlash = reduced || !forgeAt ? 0 : bloomFlash(nowMs() - forgeAt, FORGE_MS);

    root.current?.traverse((o) => {
      const raw = (o as THREE.Mesh).material;
      if (!raw || Array.isArray(raw)) return;
      const m = raw as THREE.MeshStandardMaterial;
      const base = m.userData.emissiveBase as number | undefined;
      if (base === undefined) return;
      let mult = boost;
      if (m.userData.workFlare !== undefined) {
        mult *= working ? (m.userData.workFlare as number) : 1;
        mult *= 1 + forgeFlash * 2.5; // the forge erupts on a skill draft, atop the work flare
      }
      if (!reduced && m.userData.flicker !== undefined) {
        mult *= 0.88 + 0.12 * Math.sin(t * 1.4 + (m.userData.flicker as number));
      }
      m.emissiveIntensity = base * mult;
    });

    // Hearth + forge lights ride the same grade (+ a hearth flicker, work flare, forge eruption).
    const flick = reduced ? 1 : 0.9 + 0.1 * Math.sin(t * 5);
    if (hearthLight.current) hearthLight.current.intensity = (atHome ? 9 : 5) * boost * flick;
    if (forgeLight.current) forgeLight.current.intensity = (working ? 5 : 2.2) * boost + forgeFlash * 8;
  });

  return (
    <group ref={root}>
      <Plaza mats={mats} />
      <Roads mats={mats} />
      {BUILDING_DEFS.map((b) => (
        <Building key={b.id} def={b} mats={mats} />
      ))}
      {forge && <SkillMonuments mats={mats} skills={skills} forgeX={forge.pos[0]} forgeZ={forge.pos[2]} />}

      {/* ≤4 point lights — a HARD perf cap (the bioluminescent ground bounce). Skill
          monuments add none: they ride the forge's spill + the emissive bloom. */}
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
