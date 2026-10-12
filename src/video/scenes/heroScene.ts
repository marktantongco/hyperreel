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

const HERO = ACTS[0];
const PARTICLE_COUNT = 1400;

/**
 * ACT 1 — HERO (frames 0–180)
 * Liquid-chrome torus knot inside a seeded GPU-instanced particle shell
 * with an acid light ring. Pure THREE, deterministic.
 */
export function createHeroScene(): SceneBundle {
  const group = new THREE.Group();
  group.name = "HeroScene";

  // ---- chrome torus knot -------------------------------------------------
  const knotGeo = new THREE.TorusKnotGeometry(1.15, 0.34, 220, 36);
  const knotMat = new THREE.MeshPhysicalMaterial({
    color: 0xd6d9e0,
    metalness: 1,
    roughness: 0.055,
    envMapIntensity: 1.9,
    transmission: 0.4,
    thickness: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
  });
  const knot = new THREE.Mesh(knotGeo, knotMat);
  knot.position.set(0, 0.7, 0);
  group.add(knot);

  // ---- acid light ring ---------------------------------------------------
  const ringGeo = new THREE.TorusGeometry(1.9, 0.025, 12, 160);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xc6ff3d,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(knot.position);
  group.add(ring);

  // ---- seeded particle shell (InstancedMesh) ------------------------------
  const pGeo = new THREE.OctahedronGeometry(0.05, 0);
  const pMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const particles = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_COUNT);
  particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const base = new Float32Array(PARTICLE_COUNT * 3);
  const phase = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 3.1 + random(`hero-r-${i}`) * 5.4;
    const theta = random(`hero-th-${i}`) * Math.PI * 2;
    const phi = Math.acos(2 * random(`hero-ph-${i}`) - 1);
    base[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    base[i * 3 + 1] = r * Math.cos(phi);
    base[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    phase[i] = random(`hero-phase-${i}`) * Math.PI * 2;

    const c = random(`hero-c-${i}`);
    if (c < 0.68) tint.setRGB(0.776, 1.0, 0.239); // acid
    else if (c < 0.88) tint.setRGB(1.0, 0.302, 0.18); // coral
    else tint.setRGB(0.91, 0.91, 0.925); // chrome
    particles.setColorAt(i, tint);
  }
  if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  group.add(particles);

  const update = (progress: number) => {
    const frame = progress * DURATION_IN_FRAMES;
    const vis = actVisibility(frame, HERO);
    const local = actLocalProgress(frame, HERO);

    group.visible = vis > 0.001;
    if (!group.visible) return;

    // knot choreography — fully derived from local progress
    knot.rotation.y = local * Math.PI * 5;
    knot.rotation.x = Math.PI * 0.35 + Math.sin(local * Math.PI * 2) * 0.18;
    knot.rotation.z = Math.sin(local * Math.PI * 1.5) * 0.1;
    const punchIn = backOut(clamp01(local / 0.12)); // hard punch at act start
    const pulse = 1 + 0.07 * Math.sin(local * Math.PI * 3);
    knot.scale.setScalar(punchIn * pulse);
    knotMat.opacity = vis;

    // ring
    ringMat.opacity = vis * (0.35 + 0.55 * Math.abs(Math.sin(local * Math.PI * 4)));
    ring.rotation.z = local * Math.PI * 2;
    ring.rotation.x = Math.PI * 0.5 * clamp01(local / 0.2);
    ring.scale.setScalar(0.4 + 0.6 * punchIn + 0.25 * local);

    // particle swirl — deterministic matrix math, no clocks
    const spin = local * Math.PI * 3;
    const shell = 1 + 0.22 * Math.sin(local * Math.PI * 2);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];
      const a = spin + phase[i];
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      dummy.position.set(
        (bx * ca - bz * sa) * shell,
        by + Math.sin(local * Math.PI * 2 + phase[i]) * 0.4,
        (bx * sa + bz * ca) * shell
      );
      dummy.rotation.set(a, a * 0.7, a * 0.3);
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    pMat.opacity = vis;
  };

  const dispose = () => {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    group.clear();
  };

  return { group, update, dispose };
}
