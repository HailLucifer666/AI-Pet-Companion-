/** useModelStore — the user's chosen chat model, shared across every chat
 *  surface (Chat, the Den's PetChat, Settings).
 *
 *  "auto" (the default) means role routing: the resilient failover chains from
 *  config.yaml, tried top to bottom. Any other value is a concrete
 *  "provider/model" ref that pins that single model for the turn — no failover.
 *  The choice is persisted in localStorage so it survives reloads (per-machine,
 *  like the rest of local state). */

import { create } from "zustand";
import type { ModelsAvailable } from "../lib/api";

const STORAGE_KEY = "neuraclaw-selected-model";
export const AUTO_MODEL = "auto";

function readInitial(): string {
  if (typeof localStorage === "undefined") return AUTO_MODEL;
  try {
    return localStorage.getItem(STORAGE_KEY) || AUTO_MODEL;
  } catch {
    return AUTO_MODEL; // private mode / disabled storage
  }
}

interface ModelStore {
  selectedModel: string;
  setSelectedModel: (ref: string) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  selectedModel: readInitial(),
  setSelectedModel: (ref) => {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, ref);
    } catch {
      /* quota / private mode — keep the selection in memory only */
    }
    set({ selectedModel: ref });
  },
}));

/** The value to send as the chat `model` field: null on Auto (use role routing). */
export function modelOverride(selected: string): string | null {
  return selected === AUTO_MODEL ? null : selected;
}

export interface ModelOption {
  value: string;
  label: string;
}

/** Build the selector options from live discovery: "Auto" first, then every
 *  model from reachable providers (sorted). If the current selection is a model
 *  that is no longer discoverable (provider down / removed), it's still shown,
 *  flagged "(unavailable)", so the user can see and switch off it. */
export function buildModelOptions(
  data: ModelsAvailable | undefined,
  selected: string,
): ModelOption[] {
  const discovered: ModelOption[] = Object.values(data?.providers ?? {})
    .filter((p) => p.reachable)
    .flatMap((p) => p.models)
    .map((m) => ({ value: m.ref, label: m.ref }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const known = selected === AUTO_MODEL || discovered.some((o) => o.value === selected);
  return [
    { value: AUTO_MODEL, label: "Auto (role routing)" },
    ...(known ? [] : [{ value: selected, label: `${selected} (unavailable)` }]),
    ...discovered,
  ];
}
