import { describe, expect, it } from "vitest";
import {
  INITIAL,
  reduceLumenform,
  scheduleIdle,
  type LumenformState,
} from "./LumenformFSM";

const at = (over: Partial<LumenformState> = {}): LumenformState => ({ ...INITIAL, ...over });

describe("reduceLumenform — real events drive work", () => {
  it("starts resting at home", () => {
    expect(INITIAL.place).toBe("home");
    expect(INITIAL.mode).toBe("rest");
  });

  it("walks to the Workbench and goes busy on tool-start", () => {
    const s = reduceLumenform(INITIAL, { kind: "tool-start" }, 1000);
    expect(s.place).toBe("workbench");
    expect(s.mode).toBe("work");
  });

  it("returns home and rests on done", () => {
    const working = reduceLumenform(INITIAL, { kind: "tool-start" }, 1000);
    const s = reduceLumenform(working, { kind: "done" }, 2000);
    expect(s.place).toBe("home");
    expect(s.mode).toBe("rest");
  });

  it("stays at the bench across tool-end (more tools may follow)", () => {
    const working = reduceLumenform(INITIAL, { kind: "tool-start" }, 1000);
    const s = reduceLumenform(working, { kind: "tool-end" }, 1500);
    expect(s.mode).toBe("work");
    expect(s.place).toBe("workbench");
  });

  it("plants on a formed memory without leaving its spot", () => {
    const s = reduceLumenform(at({ place: "pool" }), { kind: "memory-formed", memoryId: 7 }, 5000);
    expect(s.gesture).toBe("plant");
    expect(s.place).toBe("pool"); // plants where it stands
    expect(s.gestureUntil).toBeGreaterThan(5000);
  });

  it("celebrates a drafted skill", () => {
    const s = reduceLumenform(INITIAL, { kind: "skill-drafted" }, 0);
    expect(s.gesture).toBe("celebrate");
  });

  it("gazes when it perks up at rest, but never interrupts work", () => {
    expect(reduceLumenform(at(), { kind: "thinking" }, 0).gesture).toBe("gaze");
    const busy = at({ mode: "work", place: "workbench" });
    expect(reduceLumenform(busy, { kind: "thinking" }, 0)).toBe(busy); // unchanged
  });
});

describe("scheduleIdle — a small private life", () => {
  it("is suppressed under reduced-motion", () => {
    const s = at({ since: 0 });
    expect(scheduleIdle(s, 999_999, () => 0, true)).toBe(s);
  });

  it("never fires while busy", () => {
    const s = at({ mode: "work", since: 0 });
    expect(scheduleIdle(s, 999_999, () => 0, false)).toBe(s);
  });

  it("holds while a gesture is still playing", () => {
    const s = at({ gesture: "gaze", gestureUntil: 10_000, since: 0 });
    expect(scheduleIdle(s, 5000, () => 0, false)).toBe(s);
  });

  it("settles back to none after a gesture expires", () => {
    const s = at({ gesture: "wander", place: "wander", gestureUntil: 100, since: 0 });
    const next = scheduleIdle(s, 5000, () => 0, false);
    expect(next.gesture).toBe("none");
    expect(next.place).toBe("home"); // wander returns home
  });

  it("picks an activity once it has rested long enough (low roll → wander)", () => {
    const s = at({ since: 0 });
    const next = scheduleIdle(s, 7000, () => 0, false);
    expect(next.gesture).toBe("wander");
    expect(next.place).toBe("wander");
  });

  it("does nothing until the idle threshold passes", () => {
    const s = at({ since: 0 });
    expect(scheduleIdle(s, 3000, () => 0, false)).toBe(s);
  });
});
