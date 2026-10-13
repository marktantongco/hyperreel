/**
 * HYPERREEL determinism check.
 *
 * Contract: one choreography, two renderers — every scene is a pure
 * function of progress. This script creates the world fresh, advances it
 * to several frames (incl. frame 120 twice), snapshots all object
 * transforms + material values + shader uniforms, and asserts that two
 * independent runs produce deep-equal snapshots.
 *
 * Run: `bun run scripts/hyperreel-determinism.ts`
 * Exit code 0 = PASS.
 */
import * as THREE from "three";
import { DURATION_IN_FRAMES } from "../src/shared/acts";
import { masterDriver } from "../src/video/drivers";
import {
  createHeroScene,
  createKineticScene,
  createReelScene,
  createGridScene,
  createCtaScene,
} from "../src/video/scenes";
import type { SceneBundle } from "../src/video/scenes/types";

const FRAMES = [0, 120, 150, 450, 720, 899];

function buildWorld(): SceneBundle[] {
  return [
    createHeroScene(),
    createKineticScene(),
    createReelScene(),
    createGridScene(),
    createCtaScene(),
  ];
}

function snapshotWorld(frame: number): string {
  const bundles = buildWorld();
  const progress = frame / DURATION_IN_FRAMES;

  const d = masterDriver(progress);
  const snap: unknown[] = [
    "driver",
    d.pos,
    d.look,
    d.fov,
    d.roll,
    d.frame,
    d.params,
    d.visibility,
    d.local,
  ];

  for (const b of bundles) {
    b.update(progress);
    b.group.updateMatrixWorld(true);
    b.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      snap.push(
        obj.name || mesh.geometry?.type || "obj",
        obj.position.toArray(),
        obj.quaternion.toArray(),
        obj.scale.toArray(),
        Math.round(obj.matrixWorld.elements[0] * 1e6) / 1e6
      );
      const mat = mesh.material as
        | (THREE.Material & {
            opacity?: number;
            emissiveIntensity?: number;
            userData?: Record<string, unknown>;
          })
        | THREE.Material[]
        | undefined;
      if (mat && !Array.isArray(mat)) {
        if (typeof mat.opacity === "number") snap.push(mat.opacity);
        if (typeof mat.emissiveIntensity === "number")
          snap.push(mat.emissiveIntensity);
        const u = mat.userData?.uniforms as
          | Record<string, { value: number }>
          | undefined;
        if (u) {
          for (const key of Object.keys(u)) snap.push(key, u[key].value);
        }
      }
    });
    b.dispose();
  }
  return JSON.stringify(snap);
}

let failures = 0;

for (const frame of FRAMES) {
  // two fully independent runs (fresh scenes, fresh driver application)
  const a = snapshotWorld(frame);
  const b = snapshotWorld(frame);
  // a third run after perturbing global state with other frames
  snapshotWorld((frame + 311) % DURATION_IN_FRAMES);
  const c = snapshotWorld(frame);

  const ok = a === b && a === c;
  console.log(
    `frame ${String(frame).padStart(4, " ")} → ${ok ? "IDENTICAL" : "MISMATCH"} (${a.length} bytes)`
  );
  if (!ok) {
    failures++;
    // show the first differing chunk for debugging
    let i = 0;
    while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.error("  first diff near:", a.slice(Math.max(0, i - 60), i + 60));
  }
}

// frame 120 rendered twice, explicitly per the contract
const explicitA = snapshotWorld(120);
const explicitB = snapshotWorld(120);
if (explicitA !== explicitB) {
  failures++;
  console.error("frame 120 double-render check FAILED");
} else {
  console.log("frame 120 rendered twice → identical");
}

if (failures > 0) {
  console.error(`\nDETERMINISM CHECK FAILED (${failures} frame(s) mismatched)`);
  process.exit(1);
}
console.log("\nDETERMINISM CHECK PASSED — one choreography, two renderers, zero drift.");
