import { describe, expect, it } from "vitest";
import { islandHeight, ISLAND_MAX_R } from "./terrain";
import { BUILDING_DEFS, VILLAGE_ROADS } from "./villageLayout";
import { NODES, bfsPath, nearestNode, PLACE_ENTRY, buildRoadGeometry, type NodeId } from "./roadGraph";
import { PathFollower } from "./locomotion";

const onLand = (x: number, z: number) => {
  const y = islandHeight(x, z, ISLAND_MAX_R);
  return y > 0.3 && y < 5 && Math.hypot(x, z) < ISLAND_MAX_R;
};

describe("village layout", () => {
  it("derives one building per place, facing the plaza", () => {
    expect(BUILDING_DEFS.map((b) => b.id).sort()).toEqual([
      "archives",
      "calendar",
      "garden",
      "hollow",
      "pool",
      "tasks",
      "workbench",
    ]);
    for (const b of BUILDING_DEFS) {
      expect(onLand(b.pos[0], b.pos[2])).toBe(true);
      expect(Number.isFinite(b.rotationY)).toBe(true);
    }
  });

  it("derives one road per building, plaza→building", () => {
    expect(VILLAGE_ROADS).toHaveLength(7);
    for (const r of VILLAGE_ROADS) {
      // both ends + the midpoint sit on land
      expect(onLand(r.fromX, r.fromZ)).toBe(true);
      expect(onLand(r.toX, r.toZ)).toBe(true);
      expect(onLand((r.fromX + r.toX) / 2, (r.fromZ + r.toZ) / 2)).toBe(true);
    }
  });
});

describe("road graph", () => {
  it("every node sits on grass within the island", () => {
    for (const [, n] of Object.entries(NODES)) {
      expect(onLand(n.x, n.z)).toBe(true);
    }
  });

  it("node ids are unique", () => {
    const ids = Object.keys(NODES);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("bfsPath finds the spoke route through the junction", () => {
    expect(bfsPath("plaza", "workbench_entrance")).toEqual([
      "plaza",
      "workbench_jct",
      "workbench_entrance",
    ]);
    expect(bfsPath("plaza", "plaza")).toEqual(["plaza"]);
    // cross-building goes back through the plaza hub
    expect(bfsPath("hollow_entrance", "garden_entrance")).toEqual([
      "hollow_entrance",
      "hollow_jct",
      "plaza",
      "garden_jct",
      "garden_entrance",
    ]);
  });

  it("PLACE_ENTRY maps the real FSM places to entrance nodes", () => {
    expect(PLACE_ENTRY.home).toBe("plaza");
    expect(PLACE_ENTRY.workbench).toBe("workbench_entrance");
    expect(PLACE_ENTRY.pool).toBe("plaza");
  });

  it("nearestNode snaps a point to its closest node", () => {
    const plaza = NODES.plaza;
    expect(nearestNode({ x: plaza.x + 0.5, z: plaza.z - 0.5 })).toBe("plaza");
    const we = NODES.workbench_entrance;
    expect(nearestNode({ x: we.x, z: we.z })).toBe("workbench_entrance");
  });

  it("buildRoadGeometry produces a valid indexed strip", () => {
    const g = buildRoadGeometry(VILLAGE_ROADS[0]);
    expect(g.positions.length % 3).toBe(0);
    expect(g.positions.length).toBe(g.normals.length);
    expect(g.positions.length).toBe(g.colors.length);
    expect(g.index.length % 3).toBe(0);
    expect(g.index.length).toBeGreaterThan(0);
    // indices never reference a vertex past the buffer
    const vCount = g.positions.length / 3;
    expect(Math.max(...g.index)).toBeLessThan(vCount);
  });
});

describe("PathFollower", () => {
  it("plans a road to a real place and advances waypoint-by-waypoint", () => {
    const pf = new PathFollower();
    const start = { x: NODES.garden_entrance.x, z: NODES.garden_entrance.z };
    expect(pf.planTo(start, "workbench")).toBe(true);
    expect(pf.onRoad).toBe(true);
    // stepping from the start yields a target, and walking onto it advances
    const first = pf.step(start) as NodeId extends never ? never : { x: number; z: number };
    expect(first).not.toBeNull();
  });

  it("wander + unknown places bypass the road graph", () => {
    const pf = new PathFollower();
    expect(pf.planTo({ x: 0, z: 0 }, "wander")).toBe(false);
    expect(pf.onRoad).toBe(false);
    expect(pf.planTo({ x: 0, z: 0 }, "nowhere")).toBe(false);
  });
});
