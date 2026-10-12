import * as THREE from "three";
import { random } from "remotion";
import {
  ACTS,
  DURATION_IN_FRAMES,
  clamp01,
} from "../../shared/acts";
import { getCameraConfig, type CameraConfig } from "../../shared/theatre/parse";
import { expoInOut, power4InOut } from "../../shared/easing";
import type { CameraFrame } from "./types";

/**
 * Camera path driver.
 *
 * The CatmullRomCurve3 control points + lookAt offsets + fov live in
 * src/shared/theatre/landing.json (Theatre.js project state).
 * Editing ONLY that JSON retunes this camera — the curve is rebuilt
 * from it here, deterministically, for both renderers.
 */

interface CameraCurveSet {
  pos: THREE.CatmullRomCurve3;
  look: THREE.CatmullRomCurve3;
  fov: number;
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
  curves = {
    pos: new THREE.CatmullRomCurve3(
      config.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
      false,
      "catmullrom",
      0.5
    ),
    look: new THREE.CatmullRomCurve3(
      config.lookPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
      false,
      "catmullrom",
      0.5
    ),
    fov: config.fov,
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

// deterministic handheld drift micro-offsets (seeded)
const DRIFT = {
  ax: 0.05 + random("cam-drift-ax") * 0.04,
  fx: 0.031 + random("cam-drift-fx") * 0.02,
  ay: 0.04 + random("cam-drift-ay") * 0.03,
  fy: 0.027 + random("cam-drift-fy") * 0.02,
};

const posVec = new THREE.Vector3();
const lookVec = new THREE.Vector3();

/**
 * Camera state for a global timeline progress 0..1.
 * Power4-eased master dolly gives the film a slow push-in,
 * expo punches hit at every act boundary.
 */
export function cameraAtProgress(progress: number): CameraFrame {
  const p = clamp01(progress);
  const c = getCurves();

  // eased master position along the curve (slow cinematic ease)
  const eased = power4InOut(p);
  c.pos.getPointAt(eased, posVec);
  c.look.getPointAt(clamp01(p), lookVec);

  const frame = p * DURATION_IN_FRAMES;

  // subtle handheld drift (deterministic sines, seeded amplitudes)
  posVec.x += Math.sin(frame * DRIFT.fx * Math.PI * 2) * DRIFT.ax;
  posVec.y += Math.sin(frame * DRIFT.fy * Math.PI * 2 + 1.7) * DRIFT.ay;

  // slow exponential push-in toward the look target across the film
  const pushIn = expoInOut(p) * 0.9;
  posVec.lerp(lookVec, pushIn * 0.12);

  // fov: base + punch at act boundaries
  const fov = c.fov + transitionBump(frame) * 5.0;

  return {
    pos: [posVec.x, posVec.y, posVec.z],
    look: [lookVec.x, lookVec.y, lookVec.z],
    fov,
  };
}
