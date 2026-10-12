"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { clamp01 } from "@/shared/acts";
import { masterDriver } from "@/video/drivers";
import {
  createHeroScene,
  createKineticScene,
  createReelScene,
  createGridScene,
  createCtaScene,
  applyEnvironment,
  type SceneBundle,
} from "@/video/scenes";
import { progressStore } from "@/web/landing/progressStore";

/**
 * LiveCanvas — the interactive landing twin of the Remotion composition.
 * SAME pure scene bundles + SAME masterDriver as src/video; progress comes
 * from the GSAP-scrubbed progressStore instead of useCurrentFrame().
 * Postprocessing runs on desktop only; mobile clamps DPR to 1.5 and
 * prefers-reduced-motion keeps the canvas at a static hero frame.
 */

interface ModeFlags {
  mobile: boolean;
  reducedMotion: boolean;
}

function useModeFlags(): ModeFlags & { ready: boolean } {
  const [flags, setFlags] = useState<ModeFlags & { ready: boolean }>({
    mobile: false,
    reducedMotion: false,
    ready: false,
  });
  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 768px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () =>
      setFlags({
        mobile: mobileMq.matches,
        reducedMotion: reducedMq.matches,
        ready: true,
      });
    apply();
    mobileMq.addEventListener("change", apply);
    reducedMq.addEventListener("change", apply);
    return () => {
      mobileMq.removeEventListener("change", apply);
      reducedMq.removeEventListener("change", apply);
    };
  }, []);
  return flags;
}

const SceneRig: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const bundles = useRef<SceneBundle[]>([]);

  useLayoutEffect(() => {
    applyEnvironment(scene);
    bundles.current = [
      createHeroScene(),
      createKineticScene(),
      createReelScene(),
      createGridScene(),
      createCtaScene(),
    ];
    for (const b of bundles.current) scene.add(b.group);
    return () => {
      for (const b of bundles.current) {
        scene.remove(b.group);
        b.dispose();
      }
      bundles.current = [];
    };
  }, [scene]);

  useFrame((state) => {
    // one-way flow: store -> scene refs. No setState, no clocks.
    // Camera comes from the r3f loop callback arg (mutation belongs to
    // the render loop, not to React render).
    const camera = state.camera as THREE.PerspectiveCamera;
    const progress = clamp01(progressStore.progress);
    for (const b of bundles.current) b.update(progress);
    const d = masterDriver(progress);
    camera.position.set(d.pos[0], d.pos[1], d.pos[2]);
    camera.lookAt(d.look[0], d.look[1], d.look[2]);
    if (camera.fov !== d.fov) {
      camera.fov = d.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

export const LiveCanvas: React.FC = () => {
  const { mobile, reducedMotion, ready } = useModeFlags();
  const reducedApplied = useRef(false);

  useEffect(() => {
    if (!reducedMotion || reducedApplied.current) return;
    // static hero frame for reduced motion (written to the store, not state)
    progressStore.progress = 0.04;
    progressStore.frame = 0.04 * 900;
    reducedApplied.current = true;
  }, [reducedMotion]);

  if (!ready) {
    return (
      <div aria-hidden className="fixed inset-0 -z-10 bg-ink" />
    );
  }

  const dpr: [number, number] = mobile ? [1, 1.5] : [1, 2];
  const post = !mobile && !reducedMotion;

  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <Canvas
        dpr={dpr}
        camera={{ fov: 42, near: 0.1, far: 120, position: [0, 0.6, 13] }}
        gl={{ antialias: !mobile, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <SceneRig />
        {post ? (
          <EffectComposer>
            <Bloom
              intensity={1.35}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.5}
              mipmapBlur
            />
            <ChromaticAberration
              offset={[0.0014, 0.001]}
              radialModulation={false}
              modulationOffset={0}
            />
            <Noise
              premultiply
              blendFunction={BlendFunction.SCREEN}
              opacity={0.1}
            />
          </EffectComposer>
        ) : null}
      </Canvas>
      {/* soft vignette over the canvas (DOM, pointer-transparent) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </div>
  );
};

export default LiveCanvas;
