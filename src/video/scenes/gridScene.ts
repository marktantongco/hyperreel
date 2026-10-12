import * as THREE from "three";
import {
  ACTS,
  DURATION_IN_FRAMES,
  actLocalProgress,
  actVisibility,
  clamp01,
} from "../../shared/acts";
import { expoInOut } from "../../shared/easing";
import { getSceneParams } from "../../shared/theatre/parse";
import type { SceneBundle } from "./types";

const GRID = ACTS[3];
const GRID_N = 25; // 25 x 25 = 625 instanced boxes
const SPACING = 0.55;
const FLOOR_Y = -2.6;

/**
 * ACT 4 — CHROME GRID (frames 540–720)
 * Instanced chrome boxes on a floor with emissive acid line grid.
 * A deterministic ripple wave travels outward across the act.
 */
export function createGridScene(): SceneBundle {
  const group = new THREE.Group();
  group.name = "GridScene";

  // ---- instanced chrome boxes ----------------------------------------------
  const boxGeo = new THREE.BoxGeometry(0.4, 1, 0.4);
  const boxMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfd3da,
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: 1.35,
    transparent: true,
  });
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, GRID_N * GRID_N);
  boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(boxes);

  const dummy = new THREE.Object3D();
  const half = ((GRID_N - 1) * SPACING) / 2;

  // ---- emissive line grid ---------------------------------------------------
  const linePositions: number[] = [];
  for (let i = 0; i < GRID_N; i++) {
    const t = -half + i * SPACING;
    // lines along X
    linePositions.push(-half, FLOOR_Y, t, half, FLOOR_Y, t);
    // lines along Z
    linePositions.push(t, FLOOR_Y, -half, t, FLOOR_Y, half);
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(linePositions, 3)
  );
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xc6ff3d,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  const update = (progress: number) => {
    const frame = progress * DURATION_IN_FRAMES;
    const vis = actVisibility(frame, GRID);
    const local = actLocalProgress(frame, GRID);

    group.visible = vis > 0.001;
    if (!group.visible) return;

    const sceneParams = getSceneParams();
    const rise = expoInOut(clamp01((local - 0.05) / 0.6));
    const wave = local * Math.PI * 3;

    let idx = 0;
    for (let ix = 0; ix < GRID_N; ix++) {
      for (let iz = 0; iz < GRID_N; iz++) {
        const x = -half + ix * SPACING;
        const z = -half + iz * SPACING;
        const d = Math.sqrt(x * x + z * z);
        // traveling ripple ring, deterministic
        const w = Math.max(0, Math.sin(d * 0.85 - wave));
        const h = (0.12 + 2.3 * Math.pow(w, 3)) * rise + 0.12;
        dummy.position.set(x, FLOOR_Y + h / 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        boxes.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    boxes.instanceMatrix.needsUpdate = true;
    boxMat.opacity = vis;

    lines.position.y = FLOOR_Y + 0.02 + rise * 0.02;
    lineMat.opacity =
      vis * sceneParams.gridGlow * (0.22 + 0.3 * Math.abs(Math.sin(local * Math.PI * 2)));

    group.rotation.y = local * 0.5;
    group.position.y = rise * 1.6;
  };

  const dispose = () => {
    boxGeo.dispose();
    boxMat.dispose();
    lineGeo.dispose();
    lineMat.dispose();
    group.clear();
  };

  return { group, update, dispose };
}
