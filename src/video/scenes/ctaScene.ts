import * as THREE from "three";
import { random } from "remotion";
import {
  ACTS,
  DURATION_IN_FRAMES,
  actLocalProgress,
  actVisibility,
  clamp01,
} from "../../shared/acts";
import { backOut, expoInOut } from "../../shared/easing";
import type { SceneBundle } from "./types";

const CTA = ACTS[4];
const PARTICLE_COUNT = 2200;

/**
 * ACT 5 — CTA (frames 720–900)
 * A seeded instanced particle field converges from an 8.5-unit shell onto
 * a close-up chrome knot wrapped by a closing coral ring.
 */
export function createCtaScene(): SceneBundle {
  const group = new THREE.Group();
  group.name = "CtaScene";

  // ---- close-up chrome knot ------------------------------------------------
  const knotGeo = new THREE.TorusKnotGeometry(1.5, 0.5, 260, 40);
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0xd6d9e0,
    metalness: 1,
    roughness: 0.05,
    envMapIntensity: 2.0,
    transmission: 0.4,
    thickness: 1.6,
    clearcoat: 1,
    transparent: true,
  });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, 0.6, 0);
  group.add(knot);

  // ---- closing coral ring ---------------------------------------------------
  const ringGeo = new THREE.TorusGeometry(2.6, 0.045, 14, 180);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff4d2e,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(knot.position);
  group.add(ring);

  // ---- converging particle field --------------------------------------------
  const pGeo = new THREE.OctahedronGeometry(0.045, 0);
  const pMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const particles = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_COUNT);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(particles);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const dir = new Float32Array(PARTICLE_COUNT * 3); // unit direction
  const startR = new Float32Array(PARTICLE_COUNT);
  const stagger = new Float32Array(PARTICLE_COUNT);
  const spin = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = random(`cta-th-${i}`) * Math.PI * 2;
    const phi = Math.acos(2 * random(`cta-ph-${i}`) - 1);
    dir[i * 3] = Math.sin(phi) * Math.cos(theta);
    dir[i * 3 + 1] = Math.cos(phi);
    dir[i * 3 + 2] = Math.sin(phi) * Math.sin(theta);
    startR[i] = 7.5 + random(`cta-r-${i}`) * 2.5;
    stagger[i] = (i / PARTICLE_COUNT) * 0.25; // deterministic stagger
    spin[i] = random(`cta-spin-${i}`) * Math.PI * 2;

    const c = random(`cta-c-${i}`);
    if (c < 0.75) tint.setRGB(0.776, 1.0, 0.239);
    else if (c < 0.92) tint.setRGB(1.0, 0.302, 0.18);
    else tint.setRGB(0.91, 0.91, 0.925);
    particles.setColorAt(i, tint);
  }
  if (particles.instanceColor) particles.instanceColor.needsUpdate = true;

  const update = (progress: number) => {
    const frame = progress * DURATION_IN_FRAMES;
    const vis = actVisibility(frame, CTA);
    const local = actLocalProgress(frame, CTA);

    group.visible = vis > 0.001;
    if (!group.visible) return;

    const pop = backOut(clamp01(local / 0.1));
    knot.rotation.y = local * Math.PI * 3;
    knot.rotation.x = Math.PI * 0.25 + Math.sin(local * Math.PI * 2) * 0.12;
    knot.scale.setScalar(pop * (1 + 0.05 * Math.sin(local * Math.PI * 4)));
    knotMat.opacity = vis;

    // ring closes in as the act resolves
    const close = 1 - expoInOut(clamp01((local - 0.3) / 0.7)) * 0.55;
    ring.scale.setScalar(pop * close);
    ringMat.opacity = vis * (0.4 + 0.6 * Math.abs(Math.sin(local * Math.PI * 3)));
    ring.rotation.z = local * Math.PI * 2;
    ring.rotation.x = Math.PI * 0.5 * (1 - clamp01(local / 0.3));

    // particle convergence
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = expoInOut(clamp01((local - stagger[i]) / (1 - 0.25)));
      const r = 2.2 + (startR[i] - 2.2) * (1 - t);
      const a = local * Math.PI * 2 + spin[i];
      const dx = dir[i * 3];
      const dy = dir[i * 3 + 1];
      const dz = dir[i * 3 + 2];
      dummy.position.set(
        (dx * Math.cos(a) - dz * Math.sin(a)) * r,
        dy * r + 0.6 * (1 - t),
        (dx * Math.sin(a) + dz * Math.cos(a)) * r
      );
      dummy.rotation.set(a, a * 0.6, 0);
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    pMat.opacity = vis;
  };

  const dispose = () => {
    knotGeo.dispose();
    knotMat.dispose();
    ringGeo.dispose();
    ringMat.dispose();
    pGeo.dispose();
    pMat.dispose();
    group.clear();
  };

  return { group, update, dispose };
}
