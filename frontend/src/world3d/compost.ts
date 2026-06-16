/** compost — memory crystals fade + sink as they go unaccessed (real recency).
 *
 *  Freshness is an Ebbinghaus-style exponential decay over the time since a
 *  memory last *mattered*: its `last_accessed_at`, or `created_at` if it was
 *  never retrieved. Recently-touched memories stand tall and bright; long-dormant
 *  ones dim and sink toward the roots. Nothing is ever deleted — the network and
 *  XP a memory built persist; only its bloom fades (a FLOOR keeps a dim sunken
 *  nub). All inputs are real DB columns from /api/memory/graph — nothing faked.
 *  Pure (no three imports) → unit-tested.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_MS = 14 * DAY_MS; // a memory's bloom halves every fortnight unaccessed
const FRESH_FLOOR = 0.18; // never fully gone — the kept memory stays a dim nub

// Visual mapping of freshness → how a crystal sits in the garden.
const MAX_SINK = 0.42; // world units a fully-composted crystal sinks below its spot
const MIN_SCALE = 0.5; // composted crystals shrink to half
const MIN_DIM = 0.28; // composted crystals keep a faint glow (× base emissive)

export interface CompostSpec {
  sink: number; // subtract from the crystal's ground y (sinks toward the roots)
  scale: number; // multiply the base size (0.5..1)
  dim: number; // multiply the base emissive (0.28..1)
}

/** Parse a SQLite `datetime('now')` timestamp to epoch ms. SQLite writes UTC as
 *  "YYYY-MM-DD HH:MM:SS" (a space, no zone) — JS would read that as *local*, so we
 *  normalise to ISO + 'Z'. Returns null for empty/garbage. */
export function parseSqliteUtc(s: string | null | undefined): number | null {
  if (!s) return null;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const zoned = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso) ? iso : `${iso}Z`;
  const ms = Date.parse(zoned);
  return Number.isNaN(ms) ? null : ms;
}

/** 0..1 freshness: 1 = just touched, halving every `halfLife`, floored so a kept
 *  memory never vanishes. Unknown recency (null) → assume fresh (don't punish). */
export function freshness(recencyMs: number | null, nowMs: number, halfLife = HALF_LIFE_MS): number {
  if (recencyMs == null) return 1;
  const age = Math.max(0, nowMs - recencyMs);
  return Math.max(FRESH_FLOOR, Math.pow(0.5, age / halfLife));
}

/** Map a 0..1 freshness to how the crystal sits: sink, scale, glow. */
export function compostSpec(fresh: number): CompostSpec {
  const f = Math.max(0, Math.min(1, fresh));
  return {
    sink: (1 - f) * MAX_SINK,
    scale: MIN_SCALE + f * (1 - MIN_SCALE),
    dim: MIN_DIM + f * (1 - MIN_DIM),
  };
}
