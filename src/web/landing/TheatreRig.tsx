"use client";

import React, { useEffect } from "react";
import gsap from "gsap";
import { getProject, types } from "@theatre/core";
import landingState from "@/shared/theatre/landing.json";
import type { CameraConfig, SceneParams, Vec3 } from "@/shared/theatre/parse";
import { setLiveSceneOverride } from "@/shared/theatre/parse";
import { setLiveCameraOverride } from "@/video/drivers/cameraPath";
import { progressStore } from "./progressStore";

/**
 * TheatreRig — art-direct the landing live.
 *
 * - Hydrates the project from src/shared/theatre/landing.json
 *   (the SAME file the video drivers parse deterministically).
 * - Binds scrub progress -> sheet.sequence.position.
 * - @theatre/studio is imported DEV-ONLY
 *   (NODE_ENV !== "production" && typeof window !== "undefined")
 *   and only when the URL carries ?theatre=1, so it never hijacks a
 *   normal dev page load or any production build.
 *
 * Editing the JSON (or dragging values in the dev studio) retunes the
 * landing camera: CatmullRomCurve3 control points + lookAt offsets.
 */

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function cameraConfigFromValues(v: Record<string, unknown>): CameraConfig {
  const vec = (p: string): Vec3 => ({
    x: num(v[`${p}x`], 0),
    y: num(v[`${p}y`], 0),
    z: num(v[`${p}z`], 0),
  });
  return {
    points: [vec("p0"), vec("p1"), vec("p2"), vec("p3"), vec("p4"), vec("p5")],
    lookPoints: [vec("l0"), vec("l1"), vec("l2")],
    fov: num(v.fov, 42),
  };
}

const cameraPropDefs = {
  p0x: types.number(0), p0y: types.number(0), p0z: types.number(0),
  p1x: types.number(0), p1y: types.number(0), p1z: types.number(0),
  p2x: types.number(0), p2y: types.number(0), p2z: types.number(0),
  p3x: types.number(0), p3y: types.number(0), p3z: types.number(0),
  p4x: types.number(0), p4y: types.number(0), p4z: types.number(0),
  p5x: types.number(0), p5y: types.number(0), p5z: types.number(0),
  l0x: types.number(0), l0y: types.number(0), l0z: types.number(0),
  l1x: types.number(0), l1y: types.number(0), l1z: types.number(0),
  l2x: types.number(0), l2y: types.number(0), l2z: types.number(0),
  fov: types.number(42),
};

const scenePropDefs = {
  fogDensity: types.number(0.035),
  particleIntensity: types.number(1),
  chromeGlow: types.number(1.15),
  gridGlow: types.number(1.4),
  glitchIntensity: types.number(0.55),
  vignetteStrength: types.number(0.8),
};

export const TheatreRig: React.FC = () => {
  useEffect(() => {
    let disposed = false;
    const ticker = () => {
      if (disposed) return;
      sheet.sequence.position = progressStore.progress * 30;
    };

    const project = getProject("Landing", { state: landingState as never });
    const sheet = project.sheet("Landing");
    const cameraObj = sheet.object("Camera", cameraPropDefs);
    const sceneObj = sheet.object("Scene", scenePropDefs);

    // live editing in the studio retunes the landing camera path
    const unsubscribeCamera = cameraObj.onValuesChange((v) => {
      setLiveCameraOverride(cameraConfigFromValues(v as Record<string, unknown>));
    });
    const unsubscribeScene = sceneObj.onValuesChange((v) => {
      const values = v as Record<string, unknown>;
      const params: SceneParams = {
        fogDensity: num(values.fogDensity, 0.035),
        particleIntensity: num(values.particleIntensity, 1),
        chromeGlow: num(values.chromeGlow, 1.15),
        gridGlow: num(values.gridGlow, 1.4),
        glitchIntensity: num(values.glitchIntensity, 0.55),
        vignetteStrength: num(values.vignetteStrength, 0.8),
      };
      setLiveSceneOverride(params);
    });

    // dev-only studio, opt-in via ?theatre=1 so it never hijacks pages
    const isDev =
      process.env.NODE_ENV !== "production" && typeof window !== "undefined";
    const wantsStudio = isDev && window.location.search.includes("theatre=1");
    let studioModule: { default: { initialize: () => void } } | null = null;
    if (wantsStudio) {
      import("@theatre/studio").then((mod) => {
        if (disposed) return;
        studioModule = mod;
        mod.default.initialize();
      });
    }

    void project.ready.then(() => {
      if (disposed) return;
      gsap.ticker.add(ticker);
    });

    return () => {
      disposed = true;
      gsap.ticker.remove(ticker);
      unsubscribeCamera();
      unsubscribeScene();
    };
  }, []);

  return null;
};

export default TheatreRig;
