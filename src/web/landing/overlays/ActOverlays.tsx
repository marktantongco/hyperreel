"use client";

import React, { useEffect, useState } from "react";
import { Magnetic } from "@/web/components/Magnetic";
import { StickerBadge } from "@/web/components/StickerBadge";
import { Marquee } from "@/web/components/Marquee";

/**
 * Landing act overlays — presentational DOM with data-hr hooks that the
 * GSAP master timeline targets. Initial hidden states are owned by the
 * timeline itself (scrubbed from progress 0).
 *
 * Copy is exact per the HYPERREEL brief. No framer-motion here:
 * these layers live INSIDE the cinematic and are animated by GSAP.
 */

const NAME_STORAGE_KEY = "hyperreel-name";

/* ------------------------------------------------------------------ HERO */
export const HeroOverlay: React.FC = () => (
  <div
    data-hr-act="hero"
    className="act-section flex h-full flex-col justify-center px-6 sm:px-14 lg:px-24"
  >
    <div className="max-w-[14ch]">
      <h1 className="display-headline text-[clamp(2.6rem,9.5vw,8.5rem)] text-chrome">
        <span data-hr="hero-line-1" className="block text-acid">
          WE MAKE THE
        </span>
        <span data-hr="hero-line-2" className="block">
          INTERNET FLINCH.
        </span>
      </h1>
      <p
        data-hr="hero-sub"
        className="mono-label mt-6 max-w-md text-[10px] leading-relaxed text-chrome/80 sm:text-xs"
      >
        HYPERREEL — A 3D MOTION STUDIO FOR BRANDS WITH A PULSE.
      </p>
    </div>
    <div
      data-hr="hero-cue"
      className="mono-label absolute bottom-24 left-6 text-[11px] text-acid sm:left-14 lg:left-24"
    >
      SCROLL TO ENTER{" "}
      <span className="inline-block animate-cue-bounce" aria-hidden>
        ↓
      </span>
    </div>
    <div data-hr="hero-sticker" className="absolute right-10 top-28 hidden md:block">
      <StickerBadge variant="coral" rotate={8}>
        EST. 2026
      </StickerBadge>
    </div>
  </div>
);

/* --------------------------------------------------------------- KINETIC */
const KINETIC_WORDS = ["FAST", "LOUD", "REAL", "3D"];

export const KineticOverlay: React.FC = () => (
  <div data-hr-act="kinetic" className="act-section relative h-full w-full">
    <Marquee
      text="MOTION IS THE MESSAGE"
      className="absolute inset-x-0 top-20 z-10 border-y border-chrome/10 bg-ink/40 py-2 text-chrome/60 backdrop-blur-[2px]"
    />
    <div className="flex h-full items-center justify-center">
      <h2
        data-hr="kinetic-stack"
        className="display-headline relative text-[clamp(5rem,22vw,19rem)] text-chrome"
        style={{
          textShadow: "4px 0 rgba(255,77,46,0.55), -4px 0 rgba(198,255,61,0.55)",
        }}
      >
        {KINETIC_WORDS.map((word) => (
          <span
            key={word}
            data-hr="kinetic-word"
            data-word={word}
            className="absolute inset-0 flex items-center justify-center opacity-0"
            aria-label={word}
          >
            <span data-hr="kinetic-scramble" data-text={word} className="scramble-target">
              {word}
            </span>
          </span>
        ))}
        <span data-hr="kinetic-ghost" aria-hidden className="invisible">
          FAST
        </span>
      </h2>
    </div>
    <p
      data-hr="kinetic-line"
      className="mono-label absolute inset-x-0 bottom-28 z-10 text-center text-[11px] text-acid opacity-0 sm:text-sm"
    >
      MOTION IS THE MESSAGE.
    </p>
    <Marquee
      text="FAST · LOUD · REAL · 3D"
      className="absolute inset-x-0 bottom-0 z-10 border-y border-chrome/10 bg-ink/40 py-2 text-chrome/60"
    />
  </div>
);

/* ------------------------------------------------------------------ REEL */
const REEL_CARDS = [
  { index: "01", title: "CHROME STORMS", type: "LAUNCH FILM", accent: "text-acid" },
  { index: "02", title: "LIQUID TYPE", type: "BRAND SYSTEM", accent: "text-coral" },
  { index: "03", title: "NEON DRIPS", type: "TOUR VISUALS", accent: "text-acid" },
];

export const ReelOverlay: React.FC = () => (
  <section
    data-hr-act="reel"
    className="act-section flex h-full flex-col justify-center px-6 sm:px-14 lg:px-24"
  >
    <h2 data-hr="reel-title" className="display-headline text-[clamp(2.8rem,8vw,7rem)] text-chrome">
      <span data-hr="reel-scramble" data-text="THE REEL" className="scramble-target">
        THE REEL
      </span>
    </h2>
    <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-3 sm:gap-6">
      {REEL_CARDS.map((card) => (
        <article
          key={card.index}
          data-hr="reel-card"
          className="group rounded-2xl border border-chrome/20 bg-ink/70 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-acid/70 sm:p-7"
        >
          <div className={`mono-label text-[10px] ${card.accent}`}>{card.index}</div>
          <h3 className="display-headline mt-4 text-2xl text-chrome sm:text-4xl">{card.title}</h3>
          <p className="mono-label mt-4 text-[10px] text-chrome/70">{card.type}</p>
          <div className="mt-6 h-1 w-8 bg-chrome/20 transition-all duration-500 group-hover:w-full group-hover:bg-acid" />
        </article>
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------ GRID */
const CAPABILITIES = [
  { cap: "REAL-TIME 3D", detail: "WEBGL / R3F / 60FPS" },
  { cap: "PROGRAMMATIC VIDEO", detail: "REMOTION / DATA-DRIVEN" },
  { cap: "60FPS OR NOTHING", detail: "SCROLL-STOPS / SHADED" },
  { cap: "SHADER NATIVE", detail: "GLSL / NO STOCK PIXELS" },
];

export const GridOverlay: React.FC = () => (
  <section
    data-hr-act="grid"
    className="act-section flex h-full flex-col justify-center px-6 sm:px-14 lg:px-24"
  >
    <h2 data-hr="grid-title" className="display-headline text-[clamp(2.8rem,8vw,7rem)] text-chrome">
      <span data-hr="grid-scramble" data-text="THE MACHINE" className="scramble-target">
        THE MACHINE
      </span>
    </h2>
    <div className="mt-10 grid grid-cols-1 gap-3 sm:mt-14 sm:grid-cols-2 sm:gap-5">
      {CAPABILITIES.map((item, i) => (
        <div
          key={item.cap}
          data-hr="grid-cell"
          className="rounded-xl border bg-ink/70 p-5 backdrop-blur-sm sm:p-8"
          style={{
            borderColor: i % 2 === 0 ? "rgba(198,255,61,0.4)" : "rgba(255,77,46,0.4)",
          }}
        >
          <div className="mono-label text-[10px] text-chrome/50">
            {String(i + 1).padStart(2, "0")} /
          </div>
          <div
            className={`display-headline mt-3 text-2xl sm:text-4xl ${i % 2 === 0 ? "text-acid" : "text-coral"}`}
          >
            {item.cap}
          </div>
          <div className="mono-label mt-3 text-[10px] text-chrome/60">{item.detail}</div>
        </div>
      ))}
    </div>
  </section>
);

/* ------------------------------------------------------------------- CTA */
export const CtaOverlay: React.FC = () => {
  const [name, setName] = useState("YOU");

  useEffect(() => {
    const stored = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (!stored || stored.trim().length === 0) return;
    // deferred (rAF) so hydration stays stable and no sync effect setState
    const raf = requestAnimationFrame(() => setName(stored.trim().toUpperCase()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const displayName = name.trim().length > 0 ? name.trim().toUpperCase() : "YOU";

  return (
    <section
      data-hr-act="cta"
      className="act-section flex h-full flex-col items-center justify-center px-6 text-center"
    >
      <h2 className="display-headline text-[clamp(2.6rem,8vw,7rem)] text-chrome">
        <span data-hr="cta-title" className="block">
          READY TO FLINCH?
        </span>
      </h2>
      <p className="display-headline mt-4 text-[clamp(1.4rem,3.6vw,3rem)] text-coral">
        <span data-hr="cta-name">{displayName}</span>, LET&apos;S MAKE IT MOVE.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-7">
        <Magnetic
          href="/studio"
          className="mono-label rounded-full bg-acid px-8 py-4 text-[11px] font-bold text-ink transition-transform duration-300 hover:scale-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
          ariaLabel="Watch the reel in the studio"
        >
          WATCH THE REEL →
        </Magnetic>
        <Magnetic
          href="mailto:studio@hyperreel.example"
          className="mono-label rounded-full border-2 border-chrome/60 px-8 py-4 text-[11px] font-bold text-chrome transition-colors duration-300 hover:border-coral hover:text-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral"
          ariaLabel="Start a project with HYPERREEL"
        >
          START A PROJECT →
        </Magnetic>
      </div>
      <div className="absolute bottom-16">
        <StickerBadge variant="chrome" rotate={-3}>
          NO MOODBOARDS · JUST MOTION
        </StickerBadge>
      </div>
    </section>
  );
};
