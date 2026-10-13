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

/**
 * Web-only pointer parallax (beyond the shared choreography — the pure
 * driver stays input-free; this is presentation-layer interactivity,
 * like the custom cursor). Smoothed with a fixed per-frame damping
 * factor so no clock is read.
 */
const pointer = { tx: 0, ty: 0, x: 0, y: 0 };

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

const SceneRig: React.FC<{ interactive: boolean }> = ({ interactive }) => {
  const scene = useThree((s) => s.scene);
  const bundles = useRef<SceneBundle[]>([]);

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive]);

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

    // pointer parallax: smoothed gaze-follow (web-only, interactive)
    let px = 0;
    let py = 0;
    if (interactive) {
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      px = pointer.x;
      py = pointer.y;
    }

    camera.position.set(
      d.pos[0] + px * 0.22,
      d.pos[1] - py * 0.14,
      d.pos[2]
    );
    camera.lookAt(d.look[0] + px * 0.55, d.look[1] - py * 0.4, d.look[2]);
    // banked roll from the pure driver — leans into lateral swings
    camera.rotateZ(d.roll);
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
        camera={{ fov: 38, near: 0.1, far: 120, position: [0, 1.0, 15.5] }}
        gl={{ antialias: !mobile, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <SceneRig interactive={!mobile && !reducedMotion} />
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
