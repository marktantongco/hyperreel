/**
 * HYPERREEL composition constants + act table.
 * Single source of truth consumed by:
 *  - the Remotion composition (src/video)
 *  - the landing cinematic overlays (src/web/landing)
 *  - the player chapter markers (src/web/player)
 */

export const FPS = 30;
export const DURATION_IN_FRAMES = 900;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

/** Crossfade window (frames) between consecutive acts. */
export const CROSSFADE_FRAMES = 15;

export interface ActConfig {
  id: string;
  label: string;
  frameStart: number;
  frameEnd: number;
  /** chapter color (hex) */
  color: string;
}

export const ACTS: ActConfig[] = [
  { id: "hero", label: "HERO", frameStart: 0, frameEnd: 180, color: "#C6FF3D" },
  { id: "kinetic", label: "KINETIC TYPE", frameStart: 180, frameEnd: 360, color: "#FF4D2E" },
  { id: "reel", label: "STUDIO REEL", frameStart: 360, frameEnd: 540, color: "#E8E8EC" },
  { id: "grid", label: "CHROME GRID", frameStart: 540, frameEnd: 720, color: "#C6FF3D" },
  { id: "cta", label: "CTA", frameStart: 720, frameEnd: 900, color: "#FF4D2E" },
];

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** frame -> global progress 0..1 */
export const frameToProgress = (frame: number): number =>
  clamp01(frame / DURATION_IN_FRAMES);

/** global progress 0..1 -> frame (float) */
export const progressToFrame = (progress: number): number =>
  clamp01(progress) * DURATION_IN_FRAMES;

/** Which act owns a given frame (last act whose start <= frame). */
export function actAtFrame(frame: number): ActConfig {
  let current = ACTS[0];
  for (const act of ACTS) {
    if (frame >= act.frameStart) current = act;
  }
  return current;
}

/**
 * Local progress inside an act, 0..1, clamped outside the act range.
 */
export function actLocalProgress(frame: number, act: ActConfig): number {
  return clamp01((frame - act.frameStart) / (act.frameEnd - act.frameStart));
}

/**
 * Visibility envelope for an act across the whole timeline,
 * with soft CROSSFADE_FRAMES fade in/out at the act boundaries.
 * Returns 0 when the act is fully hidden, 1 when fully visible.
 */
export function actVisibility(frame: number, act: ActConfig): number {
  const fadeIn = clamp01(
    (frame - (act.frameStart - CROSSFADE_FRAMES)) / CROSSFADE_FRAMES
  );
  const fadeOut = clamp01(
    (act.frameEnd + CROSSFADE_FRAMES - frame) / CROSSFADE_FRAMES
  );
  return Math.min(fadeIn, fadeOut);
}

/** format a frame count as m:ss (used by HUD + player time display) */
export function formatFramesAsTime(frame: number): string {
  const totalSeconds = Math.floor(frame / FPS);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
