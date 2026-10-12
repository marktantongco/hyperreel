import * as THREE from "three";
import { random } from "remotion";

/**
 * Procedural, deterministic studio environment map.
 * A 256x128 equirectangular DataTexture: near-black gradient with
 * chrome light bands + acid/coral light streaks (seeded, no DOM, no network).
 * Used as scene.environment by both renderers — chrome materials
 * get real reflections without any stock HDRI.
 */

let cached: THREE.DataTexture | null = null;

interface Streak {
  /** vertical center 0..1 */
  y: number;
  /** vertical gaussian width */
  w: number;
  r: number;
  g: number;
  b: number;
  i: number;
}

const streaks: Streak[] = [
  { y: 0.18, w: 0.02, r: 236, g: 238, b: 244, i: 1.0 }, // key chrome light (top)
  { y: 0.34, w: 0.012, r: 198, g: 255, b: 61, i: 0.8 }, // acid rim
  { y: 0.5, w: 0.006, r: 232, g: 232, b: 236, i: 0.9 }, // chrome horizon line
  { y: 0.6, w: 0.03, r: 255, g: 77, b: 46, i: 0.45 }, // coral wash
  { y: 0.78, w: 0.015, r: 255, g: 138, b: 96, i: 0.35 }, // warm floor bounce
];

// seeded micro-streaks for a richer reflection field
for (let i = 0; i < 10; i++) {
  const y = 0.08 + random(`env-y-${i}`) * 0.84;
  const acid = random(`env-acid-${i}`) > 0.5;
  streaks.push({
    y,
    w: 0.004 + random(`env-w-${i}`) * 0.008,
    r: acid ? 198 : 255,
    g: acid ? 255 : 120,
    b: acid ? 61 : 90,
    i: 0.25 + random(`env-i-${i}`) * 0.4,
  });
}

export function makeEnvironmentTexture(): THREE.DataTexture {
  if (cached) return cached;

  const W = 256;
  const H = 128;
  const data = new Uint8Array(W * H * 4);

  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    // vertical gradient: darker at the bottom (floor), lifted at top (sky)
    const sky = Math.pow(v, 1.6);
    let r = 6 + sky * 14;
    let g = 6 + sky * 15;
    let b = 7 + sky * 18;

    for (const s of streaks) {
      const d = (v - s.y) / s.w;
      const w = Math.exp(-d * d) * s.i;
      r += s.r * w;
      g += s.g * w;
      b += s.b * w;
    }

    // subtle horizontal modulation so reflections are not perfectly uniform
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const band = 0.9 + 0.1 * Math.sin(u * Math.PI * 7.0 + v * 3.0);
      const idx = (y * W + x) * 4;
      data[idx] = Math.min(255, r * band);
      data[idx + 1] = Math.min(255, g * band);
      data[idx + 2] = Math.min(255, b * band);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

/** Assign the procedural environment to a scene (idempotent, cheap). */
export function applyEnvironment(scene: THREE.Scene): void {
  scene.environment = makeEnvironmentTexture();
}
