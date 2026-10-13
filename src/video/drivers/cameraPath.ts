import * as THREE from "three";
import { random } from "remotion";
import {
  ACTS,
  DURATION_IN_FRAMES,
  clamp,
  clamp01,
} from "../../shared/acts";
import { getCameraConfig, type CameraConfig } from "../../shared/theatre/parse";
import { expoInOut, power4InOut } from "../../shared/easing";
import type { CameraFrame } from "./types";

/**
 * Camera path driver — v3 "beyond JSON" rig.
 *
 * The CatmullRomCurve3 control points + lookAt offsets + fov live in
 * src/shared/theatre/landing.json (Theatre.js project state).
 * Editing ONLY that JSON retunes the path — the curve is rebuilt
 * from it here, deterministically, for both renderers.
 *
 * Code-level rig features (all deterministic, all progress-pure):
 *  - look-ahead gaze: the look target is sampled slightly ahead of the
 *    camera so the gaze anticipates the path (racing-line feel)
 *  - banked roll: the camera leans into lateral swings, derived from
 *    the position-curve tangent at the eased parameter
 *  - speed-aware fov: the lens widens through the fast mid-film
 *    sections (arc-length rate of the eased dolly)
 *  - two-octave handheld drift + micro rotational jitter (seeded)
 */

interface CameraCurveSet {
  pos: THREE.CatmullRomCurve3;
  look: THREE.CatmullRomCurve3;
  fov: number;
  /** total arc length of the position curve (for speed normalization) */
  length: number;
}

let curves: CameraCurveSet | null = null;
/**
 * Live override used ONLY by the Theatre.js rig on the landing page
 * (art-directing the camera in @theatre/studio updates the curve in
 * real time). Video renders + the determinism script never set it,
 * so they stay purely driven by landing.json.
 */
let liveOverride: CameraConfig | null = null;

export function setLiveCameraOverride(config: CameraConfig | null): void {
  liveOverride = config;
  curves = null; // force rebuild with the new control points
}

function getCurves(): CameraCurveSet {
  if (curves) return curves;
  const config = liveOverride ?? getCameraConfig();
  const pos = new THREE.CatmullRomCurve3(
    config.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    false,
    "catmullrom",
    0.5
  );
  curves = {
    pos,
    look: new THREE.CatmullRomCurve3(
      config.lookPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
      false,
      "catmullrom",
      0.5
    ),
    fov: config.fov,
    length: Math.max(1e-6, pos.getLength()),
  };
  return curves;
}

/** act boundaries (frames) where the camera "punches" briefly */
const BOUNDARIES = ACTS.slice(1).map((a) => a.frameStart);

/** gaussian fov bump sum near act boundaries — deterministic */
function transitionBump(frame: number): number {
  let bump = 0;
  for (const b of BOUNDARIES) {
    const d = (frame - b) / 22;
    bump += Math.exp(-d * d);
  }
  return bump;
}

// ---------------------------------------------------------------------------
// v3 rig tuning constants (code-level — intentionally NOT in the JSON:
// these are rig behavior, landing.json owns the path geometry)
// ---------------------------------------------------------------------------
/** how far ahead (in progress units) the gaze leads the camera */
const LOOK_AHEAD = 0.035;
/** roll radians per unit of lateral tangent; clamped to BANK_MAX */
const BANK_FACTOR = 0.2;
const BANK_MAX = 0.13; // ~7.5 degrees — enough to feel, not to seasick
/** extra fov at peak dolly speed (the mid-film acceleration) */
const SPEED_FOV_MAX = 3.4;
/** arc-length rate (relative to curve length) where fov boost starts/peaks */
const SPEED_LO = 1.2;
const SPEED_HI = 3.6;

// deterministic handheld drift micro-offsets (seeded)
const DRIFT = {
  ax: 0.05 + random("cam-drift-ax") * 0.04,
  fx: 0.031 + random("cam-drift-fx") * 0.02,
  ay: 0.04 + random("cam-drift-ay") * 0.03,
  fy: 0.027 + random("cam-drift-fy") * 0.02,
};

// scratch vectors — module-level, reused every frame (no per-frame allocs)
const posVec = new THREE.Vector3();
const lookVec = new THREE.Vector3();
const tanVec = new THREE.Vector3();
const prevPos = new THREE.Vector3();
const nextPos = new THREE.Vector3();

/**
 * Camera state for a global timeline progress 0..1.
 * Power4-eased master dolly gives the film a slow push-in,
 * expo punches hit at every act boundary, the rig banks into
 * swings, widens with speed, and the gaze leads the path.
 */
export function cameraAtProgress(progress: number): CameraFrame {
  const p = clamp01(progress);
  const c = getCurves();

  // eased master position along the curve (slow cinematic ease)
  const eased = power4InOut(p);
  c.pos.getPointAt(eased, posVec);

  // look-ahead gaze: sample the look curve slightly ahead of the camera
  // (clamped) so the gaze anticipates the dolly — the camera "looks
  // where it is going" instead of where it is.
  c.look.getPointAt(clamp01(p + LOOK_AHEAD), lookVec);

  const frame = p * DURATION_IN_FRAMES;

  // two-octave handheld drift (deterministic sines, seeded amplitudes)
  posVec.x +=
    Math.sin(frame * DRIFT.fx * Math.PI * 2) * DRIFT.ax +
    Math.sin(frame * DRIFT.fx * Math.PI * 4 + 0.9) * DRIFT.ax * 0.35;
  posVec.y +=
    Math.sin(frame * DRIFT.fy * Math.PI * 2 + 1.7) * DRIFT.ay +
    Math.sin(frame * DRIFT.fy * Math.PI * 4 + 2.6) * DRIFT.ay * 0.35;

  // slow exponential push-in toward the look target across the film
  const pushIn = expoInOut(p) * 0.9;
  posVec.lerp(lookVec, pushIn * 0.12);

  // ---- banked roll: lean into lateral swings (curve tangent) ----------
  c.pos.getTangentAt(eased, tanVec);
  let roll = clamp(-tanVec.x * BANK_FACTOR, -BANK_MAX, BANK_MAX);
  // micro rotational jitter, deterministic (a few tenths of a degree)
  roll += Math.sin(frame * DRIFT.fx * Math.PI * 2 + 0.35) * 0.006;

  // ---- speed-aware fov: arc-length rate of the eased dolly ------------
  const h = 0.008; // numeric sampling window in progress units
  c.pos.getPointAt(power4InOut(clamp01(p - h)), prevPos);
  c.pos.getPointAt(power4InOut(clamp01(p + h)), nextPos);
  const speed = prevPos.distanceTo(nextPos) / (2 * h); // units per progress
  const speedNorm = clamp01((speed / c.length - SPEED_LO) / (SPEED_HI - SPEED_LO));

  // fov: base + punch at act boundaries + widening through fast sections
  const fov = c.fov + transitionBump(frame) * 5.0 + speedNorm * SPEED_FOV_MAX;

  return {
    pos: [posVec.x, posVec.y, posVec.z],
    look: [lookVec.x, lookVec.y, lookVec.z],
    fov,
    roll,
  };
}
