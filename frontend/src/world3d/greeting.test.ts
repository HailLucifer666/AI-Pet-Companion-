import { describe, expect, it } from "vitest";
import { salutationFor, buildGreeting, type GreetingDigest } from "./greeting";

const BASE: GreetingDigest = { petName: "Mossy", userName: "Arghya", memoryCount: 0, skillCount: 0, xpToday: 0 };

describe("salutationFor", () => {
  it("maps the hour to a time-of-day salutation", () => {
    expect(salutationFor(2)).toBe("You're up late");
    expect(salutationFor(9)).toBe("Good morning");
    expect(salutationFor(14)).toBe("Good afternoon");
    expect(salutationFor(19)).toBe("Good evening");
    expect(salutationFor(23)).toBe("Winding down for the night");
  });
});

describe("buildGreeting", () => {
  it("states the real counts (and lists them with 'and')", () => {
    const g = buildGreeting({ ...BASE, memoryCount: 12, skillCount: 3 }, 9);
    expect(g).toContain("Good morning, Arghya.");
    expect(g).toContain("12 memories and 3 skills");
  });

  it("uses singular forms for a count of one", () => {
    const g = buildGreeting({ ...BASE, memoryCount: 1, skillCount: 1 }, 14);
    expect(g).toContain("1 memory and 1 skill");
  });

  it("omits a count that is zero (no faked facts)", () => {
    const g = buildGreeting({ ...BASE, memoryCount: 5, skillCount: 0 }, 14);
    expect(g).toContain("5 memories");
    expect(g).not.toContain("skill");
  });

  it("adds the XP line only when real XP was earned today", () => {
    expect(buildGreeting({ ...BASE, xpToday: 40 }, 9)).toContain("40 XP today");
    expect(buildGreeting({ ...BASE, xpToday: 0 }, 9)).not.toContain("XP");
  });

  it("drops the name when there is no user name", () => {
    const g = buildGreeting({ ...BASE, userName: "" }, 9);
    expect(g.startsWith("Good morning.")).toBe(true);
  });

  it("a brand-new companion still gets a warm welcome (no data)", () => {
    expect(buildGreeting(BASE, 9)).toBe("Good morning, Arghya. Glad you're here.");
  });
});
