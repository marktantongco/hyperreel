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
import { SIMPLEX_3D_GLSL } from "./simplex";

const KINETIC = ACTS[1];

interface Blob {
  mesh: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  uniforms: {
    uProgress: { value: number };
    uAmp: { value: number };
    uFreq: { value: number };
    uSeed: { value: number };
  };
  base: THREE.Vector3;
  orbitPhase: number;
  orbitRadius: number;
  baseScale: number;
}

/**
 * ACT 2 — KINETIC TYPE (frames 180–360)
 * y2k chrome blobs: icospheres displaced in the VERTEX SHADER with real
 * 3D simplex noise (GLSL injected via onBeforeCompile), with recomputed
 * normals from displaced tangents. Fully deterministic via uProgress.
 */
export function createKineticScene(): SceneBundle {
  const group = new THREE.Group();
  group.name = "KineticScene";

  const blobs: Blob[] = [];
  const blobSpecs = [
    { pos: new THREE.Vector3(-2.4, 0.7, -1.0), scale: 1.05, amp: 0.5, freq: 1.7, tint: 0xffffff },
    { pos: new THREE.Vector3(2.3, 1.5, 0.3), scale: 0.82, amp: 0.62, freq: 2.1, tint: 0xeaffc7 },
    { pos: new THREE.Vector3(0.3, -1.3, 1.4), scale: 1.25, amp: 0.55, freq: 1.45, tint: 0xffd9cf },
  ];

  blobSpecs.forEach((spec, bi) => {
    const geo = new THREE.IcosahedronGeometry(1.3, 12);
    const mat = new THREE.MeshPhysicalMaterial({
      color: spec.tint,
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 1.6,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      transparent: true,
    });

    const uniforms = {
      uProgress: { value: 0 },
      uAmp: { value: spec.amp },
      uFreq: { value: spec.freq },
      uSeed: { value: random(`blob-seed-${bi}`) * 10 },
    };

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uProgress = uniforms.uProgress;
      shader.uniforms.uAmp = uniforms.uAmp;
      shader.uniforms.uFreq = uniforms.uFreq;
      shader.uniforms.uSeed = uniforms.uSeed;

      const prelude = `
uniform float uProgress;
uniform float uAmp;
uniform float uFreq;
uniform float uSeed;
${SIMPLEX_3D_GLSL}
float hrDisp(vec3 p) {
  return uAmp * snoise(p * uFreq + vec3(uSeed, uSeed * 0.7, uSeed * 1.3) + uProgress * 1.8);
}
`;

      shader.vertexShader =
        prelude +
        shader.vertexShader
          .replace(
            "#include <beginnormal_vertex>",
            /* glsl */ `
            float hE = 0.09;
            vec3 hN = normalize(normal);
            vec3 hT1 = normalize(cross(hN, abs(hN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)) + 0.0001);
            vec3 hT2 = normalize(cross(hN, hT1));
            vec3 hP0 = position + hN * hrDisp(position);
            vec3 hP1 = position + hT1 * hE + hN * hrDisp(position + hT1 * hE);
            vec3 hP2 = position + hT2 * hE + hN * hrDisp(position + hT2 * hE);
            vec3 objectNormal = normalize(cross(hP1 - hP0, hP2 - hP0));
            vec3 hDisplaced = hP0;
            `
          )
          .replace(
            "#include <begin_vertex>",
            /* glsl */ `
            vec3 transformed = hDisplaced;
            `
          );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spec.pos);
    // exposed so the determinism check can snapshot shader uniform values
    mesh.userData.uniforms = uniforms;
    group.add(mesh);

    blobs.push({
      mesh,
      mat,
      uniforms,
      base: spec.pos.clone(),
      orbitPhase: random(`blob-phase-${bi}`) * Math.PI * 2,
      orbitRadius: 0.9 + random(`blob-orbit-${bi}`) * 1.4,
      baseScale: spec.scale,
    });
  });

  const update = (progress: number) => {
    const frame = progress * DURATION_IN_FRAMES;
    const vis = actVisibility(frame, KINETIC);
    const local = actLocalProgress(frame, KINETIC);

    group.visible = vis > 0.001;
    if (!group.visible) return;

    const spread = backOut(clamp01(local * 2.2));
    const pop = backOut(clamp01(local / 0.15));

    for (const blob of blobs) {
      blob.uniforms.uProgress.value = local;
      const a = local * Math.PI * 2 + blob.orbitPhase;
      blob.mesh.position.set(
        blob.base.x + Math.cos(a) * blob.orbitRadius * spread * 0.55,
        blob.base.y + Math.sin(a * 1.3) * blob.orbitRadius * spread * 0.4,
        blob.base.z + Math.sin(a) * blob.orbitRadius * spread * 0.55
      );
      blob.mesh.rotation.set(local * 1.4 + blob.orbitPhase, local * 2.1, local * 0.7);
      blob.mesh.scale.setScalar(blob.baseScale * (0.25 + 0.75 * pop));
      blob.mat.opacity = vis;
    }
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
