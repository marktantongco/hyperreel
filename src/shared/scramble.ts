/**
 * Deterministic text scramble (decode/ glitch effect).
 * Pure function of (text, t, seed) — the same t always decodes the
 * same characters, so the Remotion render and the live landing agree.
 */

const GLYPHS = "▓▒░<>/\\_#%&@$?!ØÆ*+=";

/** FNV-1a based deterministic hash -> 0..1 */
function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

/**
 * @param text     target string
 * @param t        resolve progress 0..1 (0 = scrambled, 1 = resolved)
 * @param seed     namespace so identical texts scramble differently
 */
export function scrambleText(text: string, t: number, seed = "hyperreel"): string {
  if (t >= 1) return text;
  const resolveT = t < 0 ? 0 : t;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " " || ch === "\n") {
      out += ch;
      continue;
    }
    // each char has its own resolve threshold in the first 70% of the timeline
    const threshold = hash01(`${seed}:${text.length}:${i}:res`) * 0.7;
    if (resolveT > threshold) {
      out += ch;
    } else {
      // glyph flicker advances in deterministic steps of t
      const step = Math.floor(resolveT * 24);
      const g = GLYPHS[Math.floor(hash01(`${seed}:${text.length}:${i}:${step}`) * GLYPHS.length)];
      out += g ?? ch;
    }
  }
  return out;
}
