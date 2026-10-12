import type * as THREE from "three";

/**
 * Renderer-agnostic scene contract shared by BOTH renderers:
 *  - the Remotion composition (src/video/HyperReelComposition.tsx)
 *  - the live landing canvas (src/web/canvas/LiveCanvas.tsx)
 *
 * Pure, deterministic: update(progress) must produce identical world state
 * for identical progress — no clocks, no RAF, no Math.random.
 * All randomness comes from seeded random() of remotion.
 */
export interface SceneBundle {
  group: THREE.Group;
  /** advance the scene to a global timeline progress 0..1 */
  update(progress: number): void;
  dispose(): void;
}
