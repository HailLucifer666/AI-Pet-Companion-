import { describe, expect, it } from "vitest";
import { fxFor, weatherFx } from "./weather";

describe("weatherFx", () => {
  it("clear → barely any cloud, no rain, no dim", () => {
    const fx = weatherFx("clear", 0);
    expect(fx.rain).toBe("none");
    expect(fx.clouds).toBeLessThan(0.2);
    expect(fx.dim).toBe(0);
    expect(fx.lightning).toBe(false);
  });

  it("rain → it rains and the light dims", () => {
    const light = weatherFx("rain", 60);
    expect(light.rain).toBe("light");
    expect(light.dim).toBeGreaterThan(0);
    expect(weatherFx("rain", 90).rain).toBe("heavy");
  });

  it("storm → heavy rain + lightning", () => {
    const fx = weatherFx("storm", 100);
    expect(fx.rain).toBe("heavy");
    expect(fx.lightning).toBe(true);
    expect(fx.clouds).toBeCloseTo(1);
  });

  it("fog → fog draws in tight", () => {
    expect(weatherFx("fog").fogScale).toBeLessThan(0.6);
  });

  it("snow → snow flag set", () => {
    expect(weatherFx("snow").snow).toBe(true);
  });

  it("overcast → heavy cloud, no precip", () => {
    const fx = weatherFx("overcast", 100);
    expect(fx.clouds).toBeGreaterThan(0.8);
    expect(fx.rain).toBe("none");
  });
});

describe("fxFor", () => {
  it("unavailable weather → clear fallback", () => {
    const fx = fxFor({ available: false });
    expect(fx.rain).toBe("none");
    expect(fx.dim).toBe(0);
  });

  it("available → maps the category", () => {
    const fx = fxFor({ available: true, category: "rain", cloud_cover: 90 });
    expect(fx.rain).toBe("heavy");
  });
});
