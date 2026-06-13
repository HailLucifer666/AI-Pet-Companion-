/** TokenBridge — the world never hardcodes color. It reads the same CSS design
 *  tokens the DOM uses (oklch custom properties) and resolves them to the hex
 *  numbers Pixi wants, so the canvas and the UI always share one palette.
 *
 *  Resolution uses a throwaway 2D canvas: assigning any CSS color to `fillStyle`
 *  makes the browser normalize it (including oklch → sRGB hex) on read-back. The
 *  string-parsing core is pure and unit-tested; the canvas step is browser-only.
 */

/** Parse `#rgb` / `#rrggbb` / `rgb()` / `rgba()` to a 24-bit number. Pure. */
export function parseColorString(input: string): number {
  const s = input.trim();
  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    return parseInt(hex.slice(0, 6), 16) || 0;
  }
  const nums = s.match(/-?\d+(\.\d+)?/g);
  if (nums && nums.length >= 3) {
    const [r, g, b] = nums.map(Number);
    return ((r & 255) << 16) | ((g & 255) << 8) | (b & 255);
  }
  return 0xffffff;
}

let probe: CanvasRenderingContext2D | null | undefined;

function cssColorToHex(css: string, fallback: number): number {
  if (probe === undefined) probe = document.createElement("canvas").getContext("2d");
  if (!probe) return parseColorString(css);
  probe.fillStyle = "#000000";
  probe.fillStyle = css;
  const out = probe.fillStyle as string;
  // Unsupported color (e.g. oklch on an old engine) leaves the prior value.
  if (out === "#000000" && !/^#0{3,6}$|black|rgba?\(0, ?0, ?0/.test(css)) return fallback;
  return parseColorString(out);
}

/** Read one design token (e.g. "--color-claw-500") as a hex number. */
export function readToken(name: string, fallback = 0xffffff): number {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  try {
    return cssColorToHex(raw, fallback);
  } catch {
    return fallback;
  }
}

export interface Palette {
  ink950: number;
  ink900: number;
  ink850: number;
  ink800: number;
  claw700: number;
  claw600: number;
  claw500: number;
  claw400: number;
  claw300: number;
  ok: number;
}

/** Snapshot the live palette. Re-read after a theme change. Fallbacks approximate
 *  the bioluminescent tokens so a resolver failure still looks intentional. */
export function readPalette(): Palette {
  return {
    ink950: readToken("--color-ink-950", 0x0a0b10),
    ink900: readToken("--color-ink-900", 0x14161d),
    ink850: readToken("--color-ink-850", 0x1a1d25),
    ink800: readToken("--color-ink-800", 0x22262f),
    claw700: readToken("--color-claw-700", 0x9a5a1c),
    claw600: readToken("--color-claw-600", 0xc47620),
    claw500: readToken("--color-claw-500", 0xe2a04a),
    claw400: readToken("--color-claw-400", 0xf0c074),
    claw300: readToken("--color-claw-300", 0xf6dba6),
    ok: readToken("--color-ok", 0x4cc38a),
  };
}
