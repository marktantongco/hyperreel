import { ACTS, type ActConfig } from "../../shared/acts";
import { getSceneParams, type SceneParams } from "../../shared/theatre/parse";

/**
 * Drivers are progress -> transform pure functions. They must stay
 * deterministic (no clocks, no Math.random) so the Remotion renderer
 * and the live landing canvas produce identical choreography.
 */

export type ActId = (typeof ACTS)[number]["id"];

export interface CameraFrame {
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
  /**
   * Banked roll around the view axis (radians). Positive = lean left,
   * negative = lean right — the camera banks INTO lateral swings like
   * a motorcycle cornering. Deterministic: derived from the curve tangent.
   */
  roll: number;
}

export interface ActParams {
  /** hero */
  heroSpin: number;
  heroPulse: number;
  heroRingGlow: number;
  /** kinetic */
  blobMix: number;
  blobSpread: number;
  /** reel */
  reelOrbit: number;
  reelGlow: number;
  /** grid */
  gridWave: number;
  gridRise: number;
  gridGlow: number;
  /** cta */
  ctaConverge: number;
  ctaRing: number;
}

export interface DriverOutput extends CameraFrame, SceneParams {
  /** global timeline progress (echoed for convenience) */
  progress: number;
  frame: number;
  /** visibility envelope 0..1 per act id */
  visibility: Record<ActId, number>;
  /** local progress 0..1 per act id */
  local: Record<ActId, number>;
  params: ActParams;
}

export type Driver = (progress: number) => DriverOutput;

/** The act table is the single frame-range authority. */
export const ACT_TABLE: ActConfig[] = ACTS;
