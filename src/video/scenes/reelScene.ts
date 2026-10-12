import * as THREE from "three";
import { random } from "remotion";
import {
  ACTS,
  DURATION_IN_FRAMES,
  actLocalProgress,
  actVisibility,
  clamp01,
} from "../../shared/acts";
import { backOut } from "../../shared/easing";
import type { SceneBundle } from "./types";

const REEL = ACTS[2];
const STREAK_COUNT = 600;

/**
 * ACT 3 — STUDIO REEL (frames 360–540)
 * Three chrome torus knots orbit a tilted coral light ring while a
 * GPU-instanced streak field flows along the ring's path.
 */
export function createReelScene(): SceneBundle {
  const group = new THREE.Group();
  group.name = "ReelScene";

  const knotGeo = new THREE.TorusKnotGeometry(0.55, 0.17, 160, 24);
  const chromeBase = {
    metalness: 1,
    roughness: 0.07,
    envMapIntensity: 1.8,
    transmission: 0.4,
    thickness: 1.0,
    clearcoat: 1,
    transparent: true,
  } as const;
  const tints = [0xffffff, 0xeaffc7, 0xffd9cf];
  const knots: THREE.Mesh[] = [];
  const knotMats: THREE.MeshPhysicalMaterial[] = [];
  const knotPhases: number[] = [];

  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshPhysicalMaterial({
      ...chromeBase,
      color: tints[i],
    });
    const mesh = new THREE.Mesh(knotGeo, mat);
    group.add(mesh);
    knots.push(mesh);
    knotMats.push(mat);
    knotPhases.push((i / 3) * Math.PI * 2 + random(`reel-phase-${i}`) * 0.6);
  }

  // ---- tilted coral ring ---------------------------------------------------
  const ringGeo = new THREE.TorusGeometry(2.3, 0.022, 12, 180);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4d2e,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.y = 0.2;
  group.add(ring);

  // secondary acid ring for chromatic depth
  const ring2Geo = new THREE.TorusGeometry(2.75, 0.014, 10, 160);
  const ring2Mat = new THREE.MeshBasicMaterial({
    color: 0xc6ff3d,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = Math.PI * 0.42;
  ring2.rotation.y = -0.15;
  group.add(ring2);

  // ---- streak particles flowing along the ring -----------------------------
  const sGeo = new THREE.BoxGeometry(0.018, 0.018, 0.42);
  const sMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const streaks = new THREE.InstancedMesh(sGeo, sMat, STREAK_COUNT);
  streaks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const angles = new Float32Array(STREAK_COUNT);
  const radii = new Float32Array(STREAK_COUNT);
  const wobbles = new Float32Array(STREAK_COUNT);
  for (let i = 0; i < STREAK_COUNT; i++) {
    angles[i] = random(`reel-ang-${i}`) * Math.PI * 2;
    radii[i] = 2.0 + random(`reel-rad-${i}`) * 1.3;
    wobbles[i] = random(`reel-wob-${i}`) * Math.PI * 2;
    const c = random(`reel-c-${i}`);
    tint.setRGB(
      0.776 + (1 - 0.776) * (c > 0.75 ? 1 : 0),
      c > 0.75 ? 0.35 : 1.0,
      c > 0.75 ? 0.2 : 0.239
    );
    streaks.setColorAt(i, tint);
  }
  if (streaks.instanceColor) streaks.instanceColor.needsUpdate = true;
  group.add(streaks);

  const RING_TILT_X = Math.PI * 0.42;

  const update = (progress: number) => {
    const frame = progress * DURATION_IN_FRAMES;
    const vis = actVisibility(frame, REEL);
    const local = actLocalProgress(frame, REEL);

    group.visible = vis > 0.001;
    if (!group.visible) return;

    const orbit = local * Math.PI * 4;
    const pop = backOut(clamp01(local / 0.14));

    knots.forEach((mesh, i) => {
      const a = orbit + knotPhases[i];
      const r = 2.6;
      mesh.position.set(
        Math.cos(a) * r,
        Math.sin(a * 2 + i) * 0.9 + 0.4,
        Math.sin(a) * r
      );
      mesh.rotation.set(local * Math.PI * 5 + i, local * Math.PI * 3, i * 0.7);
      mesh.scale.setScalar(pop * (0.9 + 0.15 * Math.sin(a * 3)));
      knotMats[i].opacity = vis;
    });

    ringMat.opacity = vis * (0.5 + 0.5 * Math.abs(Math.sin(local * Math.PI * 5)));
    ring2Mat.opacity = vis * (0.3 + 0.4 * Math.abs(Math.cos(local * Math.PI * 4)));
    ring.rotation.z = local * Math.PI * 1.5;
    ring2.rotation.z = -local * Math.PI;

    const flow = local * Math.PI * 5;
    for (let i = 0; i < STREAK_COUNT; i++) {
      const a = flow + angles[i];
      const r = radii[i] * (0.75 + 0.25 * pop);
      const wob = Math.sin(local * Math.PI * 3 + wobbles[i]) * 0.35;
      // ring plane (tilted like the big ring)
      const px = Math.cos(a) * r;
      const pz = Math.sin(a) * r;
      const py = wob;
      const cosT = Math.cos(RING_TILT_X);
      const sinT = Math.sin(RING_TILT_X);
      dummy.position.set(px, py * cosT - pz * sinT, py * sinT + pz * cosT);
      dummy.rotation.set(RING_TILT_X, a, 0);
      dummy.scale.set(1, 1, 1 + 1.5 * Math.abs(Math.sin(a * 2 + wobbles[i])));
      dummy.updateMatrix();
      streaks.setMatrixAt(i, dummy.matrix);
    }
    streaks.instanceMatrix.needsUpdate = true;
    sMat.opacity = vis;
  };

  const dispose = () => {
    knotGeo.dispose();
    ringGeo.dispose();
    ring2Geo.dispose();
    sGeo.dispose();
    knotMats.forEach((m) => m.dispose());
    ringMat.dispose();
    ring2Mat.dispose();
    sMat.dispose();
    group.clear();
  };

  return { group, update, dispose };
}
