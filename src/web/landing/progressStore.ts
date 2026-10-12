import { DURATION_IN_FRAMES, actAtFrame } from "@/shared/acts";

/**
 * The landing progress store — a plain mutable object written by the GSAP
 * master timeline (scrub) and read every frame by the react-three-fiber
 * canvas. Deliberately NOT React state: no per-frame setState.
 * The only notifications that leave this module are act *changes*
 * (fires at most 4 times per scroll-through).
 */

export interface LandingState {
  /** global timeline progress 0..1 */
  progress: number;
  /** derived frame 0..900 */
  frame: number;
  /** index of the active act (0..4) */
  actIndex: number;
}

export const progressStore: LandingState = {
  progress: 0,
  frame: 0,
  actIndex: 0,
};

export type ActListener = (actIndex: number) => void;

const listeners = new Set<ActListener>();

export function subscribeAct(listener: ActListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called by the GSAP timeline's onUpdate — cheap, no React. */
export function setProgress(progress: number): void {
  const p = Math.min(1, Math.max(0, progress));
  progressStore.progress = p;
  progressStore.frame = p * DURATION_IN_FRAMES;
  const act = actAtFrame(progressStore.frame);
  const actIndex = Number(
    act.id === "hero" ? 0 : act.id === "kinetic" ? 1 : act.id === "reel" ? 2 : act.id === "grid" ? 3 : 4
  );
  if (actIndex !== progressStore.actIndex) {
    progressStore.actIndex = actIndex;
    for (const listener of listeners) listener(actIndex);
  }
}
