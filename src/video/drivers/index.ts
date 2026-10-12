import {
  ACTS,
  DURATION_IN_FRAMES,
  actLocalProgress,
  actVisibility,
  clamp01,
} from "../../shared/acts";
import { backOut, expoInOut, smoothstep } from "../../shared/easing";
import { getSceneParams } from "../../shared/theatre/parse";
import { cameraAtProgress } from "./cameraPath";
import type { DriverOutput, ActId } from "./types";

/**
 * masterDriver — THE choreography. Pure function of global progress 0..1.
 * Consumed by every scene bundle and by both renderers
 * (Remotion composition + live landing canvas) so frame 120 rendered
 * twice is identical.
 */

const emptyVis = () => {
  const v: Record<string, number> = {};
  for (const a of ACTS) v[a.id] = 0;
  return v as Record<ActId, number>;
};

const emptyLocal = () => {
  const l: Record<string, number> = {};
  for (const a of ACTS) l[a.id] = 0;
  return l as Record<ActId, number>;
};

const actById = (id: string) => ACTS.find((a) => a.id === id) as (typeof ACTS)[number];

// memo cache — same input must return same output; cache never changes values
let cacheP = -1;
let cacheOut: DriverOutput | null = null;

export function masterDriver(progress: number): DriverOutput {
  const p = clamp01(progress);
  if (cacheOut && cacheP === p) return cacheOut;

  const frame = p * DURATION_IN_FRAMES;
  const cam = cameraAtProgress(p);
  const scene = getSceneParams();

  const visibility = emptyVis();
  const local = emptyLocal();
  for (const act of ACTS) {
    visibility[act.id] = actVisibility(frame, act);
    local[act.id] = actLocalProgress(frame, act);
  }

  const heroL = local.hero;
  const kineticL = local.kinetic;
  const reelL = local.reel;
  const gridL = local.grid;
  const ctaL = local.cta;

  const out: DriverOutput = {
    ...cam,
    ...scene,
    progress: p,
    frame,
    visibility,
    local,
    params: {
      // hero: knot spins up, ring ignites with the beat
      heroSpin: heroL,
      heroPulse: heroL,
      heroRingGlow: smoothstep(clamp01((heroL - 0.25) / 0.5)) * (0.5 + 0.5 * Math.sin(heroL * Math.PI * 6)),

      // kinetic: blobs swell + spread out of the center
      blobMix: kineticL,
      blobSpread: backOut(clamp01(kineticL * 2.2)),

      // reel: orbit speed + glow
      reelOrbit: reelL,
      reelGlow: visibility.reel * (0.6 + 0.4 * Math.sin(reelL * Math.PI * 5)),

      // grid: ripple wave + rise
      gridWave: gridL,
      gridRise: expoInOut(clamp01((gridL - 0.05) / 0.6)),
      gridGlow: visibility.grid,

      // cta: particles converge, ring closes
      ctaConverge: expoInOut(ctaL),
      ctaRing: ctaL,
    },
  };

  cacheP = p;
  cacheOut = out;
  return out;
}

/** re-export for convenience */
export { actById };
export type { DriverOutput };
