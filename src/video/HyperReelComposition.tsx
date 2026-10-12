import React, { useLayoutEffect, useMemo, useRef } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import {
  ACTS,
  DURATION_IN_FRAMES,
  clamp01,
  formatFramesAsTime,
} from "../shared/acts";
import { scrambleText } from "../shared/scramble";
import { TOKENS } from "../shared/tokens";
import { masterDriver } from "./drivers";
import {
  createHeroScene,
  createKineticScene,
  createReelScene,
  createGridScene,
  createCtaScene,
  applyEnvironment,
  type SceneBundle,
} from "./scenes";

/**
 * HYPERREEL — the Remotion composition (1920x1080@30fps, 900 frames).
 * One choreography, two renderers: this file mounts the SAME pure scene
 * bundles the live landing canvas uses, driven by useCurrentFrame().
 * GSAP handles advanced easing (parseEase + utils.interpolate) in a
 * useMemo keyed on [frame], written into a mutable rig consumed via refs —
 * never per-frame React state.
 */

export type HyperReelProps = {
  name: string;
};

const FONT_DISPLAY =
  "'Space Grotesk', 'Archivo', 'Arial Black', 'Helvetica Neue', sans-serif";
const FONT_MONO = "'Space Grotesk', 'IBM Plex Mono', 'Courier New', monospace";

const INK = TOKENS.ink;
const ACID = TOKENS.acid;
const CORAL = TOKENS.coral;
const CHROME = TOKENS.chrome;

// ---------------------------------------------------------------- rig (gsap)
interface VideoRig {
  /** gsap power4.inOut-eased master dolly 0..1 */
  dolly: number;
  /** sharp act-transition punch 0..1 (used for fov kick + chroma) */
  punch: number;
}

const BOUNDARIES = ACTS.slice(1).map((a) => a.frameStart);

function transitionPunch(frame: number): number {
  let punch = 0;
  for (const b of BOUNDARIES) {
    const d = (frame - b) / 7;
    punch += Math.exp(-d * d);
  }
  return Math.min(1, punch);
}

/** gsap-eased rig values as pure derived data (never React state). */
function videoRig(frame: number, durationInFrames: number): VideoRig {
  // advanced easing: gsap.utils.interpolate + parseEase("power4.inOut")
  const dolly = gsap.utils.interpolate(0, 1) as (progress: number) => number;
  const t = clamp01(frame / Math.max(1, durationInFrames - 1));
  const easedT = (gsap.parseEase("power4.inOut") as (p: number) => number)(t);
  return { dolly: dolly(easedT), punch: transitionPunch(frame) };
}

// ------------------------------------------------------------- 3D world mount
const WorldBridge: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
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
    const camera = state.camera as THREE.PerspectiveCamera;
    const progress = clamp01(frame / durationInFrames);
    for (const b of bundles.current) b.update(progress);
    const d = masterDriver(progress);
    // gsap-eased rig values (pure function of frame, never React state)
    const rig = videoRig(frame, durationInFrames);
    camera.position.set(d.pos[0], d.pos[1], d.pos[2] - rig.dolly * 0.5);
    const look = new THREE.Vector3(d.look[0], d.look[1], d.look[2]);
    camera.lookAt(look);
    // fov kick at act transitions (punch) — mutation happens in the r3f
    // render-loop callback, not during React render
    camera.fov = d.fov + rig.punch * 4;
    camera.updateProjectionMatrix();
  });

  return null;
};

// ------------------------------------------------------------------- overlays
const HeroLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = ["WE", "MAKE", "THE", "INTERNET", "FLINCH."];
  const exit = interpolate(frame, [150, 180], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = 1 - exit;
  const rise = interpolate(frame, [150, 180], [0, -80], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "120px 140px",
        opacity,
        transform: `translateY(${rise}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 150,
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          color: CHROME,
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: ACID }}>
          {scrambleText("WE MAKE THE", clamp01((frame - 2) / 26))}
        </span>
        <br />
        {words.slice(3).map((w, i) => {
          const s = spring({
            frame: frame - 10 - i * 5,
            fps,
            config: { damping: 14, stiffness: 210, mass: 0.9 },
          });
          return (
            <span
              key={w}
              style={{
                display: "inline-block",
                transform: `scale(${0.85 + s * 0.15}) translateY(${(1 - s) * 40}px)`,
                color: CHROME,
                WebkitTextStroke: frame < 26 ? `1px ${ACID}` : "0px",
              }}
            >
              {w}&nbsp;
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 34,
          fontFamily: FONT_MONO,
          fontSize: 26,
          letterSpacing: "0.24em",
          color: CHROME,
          opacity: interpolate(frame, [26, 46, 150, 170], [0, 0.85, 0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textTransform: "uppercase",
        }}
      >
        {scrambleText("HYPERREEL — A 3D MOTION STUDIO FOR BRANDS WITH A PULSE.", clamp01((frame - 24) / 24))}
      </div>
    </AbsoluteFill>
  );
};

const KINETIC_WORDS = [
  { word: "FAST", start: 180, end: 225 },
  { word: "LOUD", start: 225, end: 270 },
  { word: "REAL", start: 270, end: 315 },
  { word: "3D", start: 315, end: 360 },
];

const KineticLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const active = KINETIC_WORDS.find((w) => frame >= w.start && frame < w.end);
  if (!active) return null;

  const local = frame - active.start;
  const span = active.end - active.start;
  const sIn = spring({ frame: local, fps, config: { damping: 11, stiffness: 240, mass: 0.8 } });
  const outT = clamp01((local - (span - 12)) / 12);
  const glitch = interpolate(local, [0, 4, 8, 12], [16, -9, 5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chroma = 6 * (1 - clamp01(local / 14)) + 3 * transitionPunch(frame);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 420,
          letterSpacing: "-0.03em",
          color: CHROME,
          transform: `skewX(${glitch}deg) scale(${1.45 - sIn * 0.45 + outT * 0.35})`,
          opacity: clamp01(sIn) * (1 - outT),
          textShadow: `${chroma}px 0 ${CORAL}, ${-chroma}px 0 ${ACID}`,
          mixBlendMode: "normal",
        }}
      >
        {scrambleText(active.word, clamp01(local / 10))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 120,
          fontFamily: FONT_MONO,
          fontSize: 30,
          letterSpacing: "0.3em",
          color: ACID,
          opacity: interpolate(frame, [300, 322, 352, 360], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {scrambleText("MOTION IS THE MESSAGE.", clamp01((frame - 300) / 18))}
      </div>
      {/* kinetic marquee strip — transform derived from frame (deterministic) */}
      <div style={{ position: "absolute", top: 96, left: 0, right: 0, overflow: "hidden", opacity: 0.5 }}>
        <div
          style={{
            display: "flex",
            gap: 60,
            whiteSpace: "nowrap",
            fontFamily: FONT_MONO,
            fontSize: 22,
            letterSpacing: "0.4em",
            color: CHROME,
            transform: `translateX(${-(frame * 42) % 1400}px)`,
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i}>FAST ✦ LOUD ✦ REAL ✦ 3D ✦ MOTION IS THE MESSAGE ✦</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const REEL_CARDS = [
  { title: "CHROME STORMS", type: "LAUNCH FILM", index: "01", from: -1 },
  { title: "LIQUID TYPE", type: "BRAND SYSTEM", index: "02", from: 1 },
  { title: "NEON DRIPS", type: "TOUR VISUALS", index: "03", from: -1 },
];

const ReelLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const title = scrambleText("THE REEL", clamp01((frame - 366) / 18));
  const exit = interpolate(frame, [515, 540], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "150px 140px",
        opacity: 1 - exit,
        transform: `translateY(${exit * -60}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 110,
          color: CHROME,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          gap: 36,
          marginTop: 70,
        }}
      >
        {REEL_CARDS.map((card, i) => {
          const start = 380 + i * 10;
          const x = interpolate(frame, [start, start + 14], [card.from * 620, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.exp),
          });
          const op = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const hover = Math.sin((frame - start) * 0.2 + i * 2) * 8;
          return (
            <div
              key={card.index}
              style={{
                flex: 1,
                border: `1px solid ${CHROME}55`,
                borderRadius: 18,
                padding: "36px 32px",
                background: `${INK}B8`,
                transform: `translateX(${x}px) translateY(${hover}px)`,
                opacity: op,
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 22, color: i === 1 ? CORAL : ACID }}>
                {card.index}
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 52,
                  color: CHROME,
                  marginTop: 18,
                  letterSpacing: "-0.01em",
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 20,
                  letterSpacing: "0.28em",
                  color: `${CHROME}99`,
                  marginTop: 22,
                }}
              >
                {card.type}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CAPS = ["REAL-TIME 3D", "PROGRAMMATIC VIDEO", "60FPS OR NOTHING", "SHADER NATIVE"];

const GridLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [695, 720], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "150px 140px",
        opacity: 1 - exit,
        transform: `translateY(${exit * -60}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 110,
          color: CHROME,
          letterSpacing: "-0.02em",
        }}
      >
        {scrambleText("THE MACHINE", clamp01((frame - 546) / 18))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 28,
          marginTop: 64,
        }}
      >
        {CAPS.map((cap, i) => {
          const start = 560 + i * 8;
          const op = interpolate(frame, [start, start + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const glitch = interpolate(frame, [start, start + 4, start + 8], [12, -6, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={cap}
              style={{
                border: `1px solid ${i % 2 === 0 ? ACID : CORAL}66`,
                borderRadius: 14,
                padding: "44px 36px",
                background: `${INK}A0`,
                opacity: op,
                transform: `skewX(${glitch}deg)`,
              }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 20, color: `${CHROME}80` }}>
                {String(i + 1).padStart(2, "0")} /
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 54,
                  color: i % 2 === 0 ? ACID : CORAL,
                  marginTop: 14,
                  letterSpacing: "0.01em",
                }}
              >
                {scrambleText(cap, clamp01((frame - start - 2) / 14))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CtaLayer: React.FC<{ name: string }> = ({ name }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const displayName = name.trim().length > 0 ? name.trim().toUpperCase() : "YOU";

  const s = spring({ frame: frame - 728, fps, config: { damping: 13, stiffness: 200 } });
  const slate = interpolate(frame, [860, 880, 898, 900], [0, 1, 1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        opacity: clamp01(s),
      }}
    >
      {/* ghost name watermark behind */}
      <div
        style={{
          position: "absolute",
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 340,
          color: `${ACID}12`,
          transform: `translateY(${(1 - s) * 60}px)`,
          letterSpacing: "0.02em",
        }}
      >
        {displayName}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 120,
          color: CHROME,
          letterSpacing: "-0.01em",
          transform: `scale(${0.9 + s * 0.1})`,
        }}
      >
        {scrambleText("READY TO FLINCH?", clamp01((frame - 724) / 20))}
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 84,
          marginTop: 26,
          color: CORAL,
          transform: `translateY(${(1 - s) * 30}px)`,
        }}
      >
        {scrambleText(displayName, clamp01((frame - 740) / 22))}, LET&apos;S MAKE IT MOVE.
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 64 }}>
        {["WATCH THE REEL →", "START A PROJECT →"].map((label, i) => {
          const bs = spring({ frame: frame - 770 - i * 8, fps, config: { damping: 15 } });
          return (
            <div
              key={label}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 24,
                letterSpacing: "0.22em",
                color: i === 0 ? INK : CHROME,
                background: i === 0 ? ACID : "transparent",
                border: `2px solid ${i === 0 ? ACID : `${CHROME}88`}`,
                borderRadius: 999,
                padding: "22px 44px",
                opacity: clamp01(bs),
                transform: `translateY(${(1 - bs) * 24}px)`,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          fontFamily: FONT_MONO,
          fontSize: 20,
          letterSpacing: "0.3em",
          color: `${CHROME}90`,
          opacity: slate,
        }}
      >
        HYPERREEL © 2026 · MADE AT 60FPS · EST. 2026
      </div>
    </AbsoluteFill>
  );
};

// ----------------------------------------------------------------- film HUD
const FilmHud: React.FC = () => {
  const frame = useCurrentFrame();
  const act = ACTS.reduce((acc, a) => (frame >= a.frameStart ? a : acc), ACTS[0]);
  const opacity = 0.75;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      {/* corner brackets */}
      {[
        { top: 40, left: 40, borderTop: `2px solid ${ACID}88`, borderLeft: `2px solid ${ACID}88` },
        { top: 40, right: 40, borderTop: `2px solid ${ACID}88`, borderRight: `2px solid ${ACID}88` },
        { bottom: 40, left: 40, borderBottom: `2px solid ${ACID}88`, borderLeft: `2px solid ${ACID}88` },
        { bottom: 40, right: 40, borderBottom: `2px solid ${ACID}88`, borderRight: `2px solid ${ACID}88` },
      ].map((style, i) => (
        <div key={i} style={{ position: "absolute", width: 46, height: 46, ...style }} />
      ))}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 110,
          fontFamily: FONT_MONO,
          fontSize: 20,
          letterSpacing: "0.26em",
          color: `${CHROME}CC`,
        }}
      >
        HYPERREEL_FILM · {act.label}
      </div>
      <div
        style={{
          position: "absolute",
          top: 52,
          right: 110,
          fontFamily: FONT_MONO,
          fontSize: 20,
          letterSpacing: "0.26em",
          color: act.color,
        }}
      >
        F {String(Math.min(frame, DURATION_IN_FRAMES - 1)).padStart(4, "0")} / {DURATION_IN_FRAMES} · {formatFramesAsTime(frame)}
      </div>
    </AbsoluteFill>
  );
};

// -------------------------------------------------------------------- grain
const GrainLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = frame % 24;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity: 0.07 }}>
      <svg width="100%" height="100%">
        <filter id="hyperreel-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        </filter>
        <rect width="100%" height="100%" filter="url(#hyperreel-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------- composition
export const HyperReelComposition: React.FC<HyperReelProps> = ({ name }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  // punch drives the ChromaticAberration spike — pure derived value
  const punchChroma = useMemo(() => transitionPunch(frame), [frame]);

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* backdrop glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 700px at 50% 42%, #16171c 0%, ${INK} 62%)`,
        }}
      />
      {/* the 3D cinematic — same scene bundles as the landing canvas */}
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 42, near: 0.1, far: 120, position: [0, 0.6, 13] }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <WorldBridge />
        <EffectComposer>
          <Bloom intensity={1.35} luminanceThreshold={0.22} luminanceSmoothing={0.5} mipmapBlur />
          <ChromaticAberration
            offset={[0.0012 + punchChroma * 0.002, 0.0009 + punchChroma * 0.0015]}
            radialModulation={false}
            modulationOffset={0}
          />
          <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.12} />
        </EffectComposer>
      </ThreeCanvas>

      {/* DOM layers over the 3D scene */}
      <HeroLayer />
      <KineticLayer />
      <ReelLayer />
      <GridLayer />
      <CtaLayer name={name} />

      {/* vignette + HUD + grain */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)`,
        }}
      />
      <FilmHud />
      <GrainLayer />
    </AbsoluteFill>
  );
};

export default HyperReelComposition;
