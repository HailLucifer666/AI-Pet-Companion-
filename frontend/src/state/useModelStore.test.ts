import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  useModelStore,
  AUTO_MODEL,
  modelOverride,
  buildModelOptions,
} from "./useModelStore";
import type { ModelsAvailable } from "../lib/api";

// vitest runs in the "node" environment (no DOM); stub a minimal localStorage
// for the persistence test. The store itself guards `typeof localStorage`.
function memoryStorage() {
  const m: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in m ? m[k] : null),
    setItem: (k: string, v: string) => {
      m[k] = String(v);
    },
    removeItem: (k: string) => {
      delete m[k];
    },
    clear: () => {
      for (const k of Object.keys(m)) delete m[k];
    },
  };
}

describe("useModelStore", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", memoryStorage());
    useModelStore.setState({ selectedModel: AUTO_MODEL });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to auto", () => {
    expect(useModelStore.getState().selectedModel).toBe(AUTO_MODEL);
  });

  it("setSelectedModel updates state and persists to localStorage", () => {
    useModelStore.getState().setSelectedModel("nim/meta/llama-3.3-70b-instruct");
    expect(useModelStore.getState().selectedModel).toBe("nim/meta/llama-3.3-70b-instruct");
    expect(localStorage.getItem("AI Pet Companion-selected-model")).toBe(
      "nim/meta/llama-3.3-70b-instruct",
    );
  });
});

describe("modelOverride", () => {
  it("is null on auto and the ref otherwise", () => {
    expect(modelOverride("auto")).toBeNull();
    expect(modelOverride("nim/x")).toBe("nim/x");
  });
});

describe("buildModelOptions", () => {
  const data: ModelsAvailable = {
    providers: {
      nim: {
        reachable: true,
        models: [
          { id: "b", ref: "nim/b" },
          { id: "a", ref: "nim/a" },
        ],
      },
      ollama: { reachable: false, models: [{ id: "x", ref: "ollama/x" }] },
    },
  };

  it("puts Auto first, includes only reachable providers, sorted by ref", () => {
    const opts = buildModelOptions(data, "auto");
    expect(opts[0]).toEqual({ value: "auto", label: "Auto (role routing)" });
    expect(opts.map((o) => o.value)).toEqual(["auto", "nim/a", "nim/b"]); // ollama excluded
  });

  it("yields just Auto when discovery is empty/undefined", () => {
    expect(buildModelOptions(undefined, "auto")).toEqual([
      { value: "auto", label: "Auto (role routing)" },
    ]);
  });

  it("flags a selection that is no longer discoverable as (unavailable)", () => {
    const opts = buildModelOptions(data, "ollama/x");
    expect(opts[0].value).toBe("auto");
    expect(opts[1]).toEqual({ value: "ollama/x", label: "ollama/x (unavailable)" });
    expect(opts.some((o) => o.value === "nim/a")).toBe(true);
  });
});
