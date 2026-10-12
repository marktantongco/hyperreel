/**
 * Pure parser for the Theatre.js project state in landing.json.
 *
 * The SAME JSON is used two ways:
 *  1. Hydrated at runtime by @theatre/core via getProject("Landing", {state})
 *     (see src/web/landing/TheatreRig.tsx) — the studio can retune it live.
 *  2. Parsed here, deterministically, by the video drivers + landing canvas,
 *     so editing ONLY this file retunes the camera path everywhere.
 *
 * This module must stay dependency-free (no @theatre/core import) because it
 * runs inside src/video (Remotion land, renderer-agnostic) and inside the
 * determinism script under bun.
 */
import landingState from "./landing.json";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CameraConfig {
  /** CatmullRomCurve3 control points for the camera position. */
  points: Vec3[];
  /** CatmullRomCurve3 control points for the lookAt target. */
  lookPoints: Vec3[];
  fov: number;
}

export interface SceneParams {
  fogDensity: number;
  particleIntensity: number;
  chromeGlow: number;
  gridGlow: number;
  glitchIntensity: number;
  vignetteStrength: number;
}

type Loose = Record<string, unknown>;

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function objectOverrides(objectKey: string): Loose {
  const state = landingState as unknown as {
    sheetsById?: Record<string, {
      staticOverrides?: { byObject?: Record<string, Loose> };
    }>;
  };
  const sheet = state.sheetsById?.["Landing"];
  return sheet?.staticOverrides?.byObject?.[objectKey] ?? {};
}

function parseVec3List(props: Loose, prefixes: string[]): Vec3[] {
  return prefixes.map((p) => ({
    x: num(props[`${p}x`], 0),
    y: num(props[`${p}y`], 0),
    z: num(props[`${p}z`], 0),
  }));
}

/** Camera control points + lookAt offsets + fov from the theatre state. */
export function getCameraConfig(): CameraConfig {
  const props = objectOverrides("Camera");
  return {
    points: parseVec3List(props, ["p0", "p1", "p2", "p3", "p4", "p5"]),
    lookPoints: parseVec3List(props, ["l0", "l1", "l2"]),
    fov: num(props.fov, 42),
  };
}

/** Global scene parameters from the theatre state. */
let liveSceneOverride: SceneParams | null = null;

/** Live override used only by the Theatre.js rig on the landing page. */
export function setLiveSceneOverride(params: SceneParams | null): void {
  liveSceneOverride = params;
}

export function getSceneParams(): SceneParams {
  if (liveSceneOverride) return liveSceneOverride;
  const p = objectOverrides("Scene");
  return {
    fogDensity: num(p.fogDensity, 0.035),
    particleIntensity: num(p.particleIntensity, 1),
    chromeGlow: num(p.chromeGlow, 1.15),
    gridGlow: num(p.gridGlow, 1.4),
    glitchIntensity: num(p.glitchIntensity, 0.55),
    vignetteStrength: num(p.vignetteStrength, 0.8),
  };
}
