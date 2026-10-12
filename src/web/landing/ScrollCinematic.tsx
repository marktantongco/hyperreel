"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ACTS,
  DURATION_IN_FRAMES,
  formatFramesAsTime,
} from "@/shared/acts";
import { scrambleText } from "@/shared/scramble";
import { setProgress } from "./progressStore";
import { SEEK_ACT_EVENT } from "./actNavigation";
import {
  HeroOverlay,
  KineticOverlay,
  ReelOverlay,
  GridOverlay,
  CtaOverlay,
} from "./overlays/ActOverlays";
import { Hud } from "./Hud";

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollCinematic — the landing's scroll choreography.
 *
 * ONE master GSAP timeline (scrub: true, pinned acts) on desktop;
 * on mobile the acts become normal-flow sections over the fixed canvas;
 * prefers-reduced-motion gets a static hero + simple fades.
 * Progress is written into the mutable progressStore (never setState)
 * which the react-three-fiber canvas reads every frame.
 */

const at = (frame: number): number => frame / DURATION_IN_FRAMES;

const KINETIC_WINDOWS = ACTS[1]
  ? [
      { word: "FAST", start: 180, end: 225 },
      { word: "LOUD", start: 225, end: 270 },
      { word: "REAL", start: 270, end: 315 },
      { word: "3D", start: 315, end: 360 },
    ]
  : [];

function addScramble(
  tl: gsap.core.Timeline,
  el: HTMLElement,
  text: string,
  startFrame: number,
  endFrame: number
): void {
  const proxy = { p: 0 };
  el.textContent = scrambleText(text, 0);
  tl.to(
    proxy,
    {
      p: 1,
      duration: Math.max(0.0001, at(endFrame) - at(startFrame)),
      onUpdate: () => {
        el.textContent = scrambleText(text, proxy.p);
      },
    },
    at(startFrame)
  );
}

export const ScrollCinematic: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const q = (sel: string): HTMLElement | null => stage.querySelector(sel);
    const qa = (sel: string): HTMLElement[] =>
      Array.from(stage.querySelectorAll(sel));

    const hudFrame = q('[data-hr="hud-frame"]');
    const sections = qa("[data-hr-act]");

    const updateHud = (progress: number) => {
      if (!hudFrame) return;
      const frame = progress * DURATION_IN_FRAMES;
      hudFrame.textContent = `F ${String(Math.round(frame)).padStart(4, "0")} / 900 · ${formatFramesAsTime(frame)}`;
    };

    // hero entrance (desktop + mobile, scroll-independent)
    const heroIntro = (): gsap.core.Timeline => {
      const line1 = q('[data-hr="hero-line-1"]');
      const line2 = q('[data-hr="hero-line-2"]');
      const tl = gsap.timeline({ delay: 0.4 });
      if (line1) {
        line1.textContent = scrambleText("WE MAKE THE", 0);
        const proxy = { p: 0 };
        tl.to(
          proxy,
          {
            p: 1,
            duration: 0.9,
            ease: "power2.inOut",
            onUpdate: () => {
              line1.textContent = scrambleText("WE MAKE THE", proxy.p);
            },
          },
          0.1
        );
      }
      tl.from(line2 ?? {}, { yPercent: 110, opacity: 0, duration: 0.75, ease: "expo.out" }, 0.08);
      tl.from(q('[data-hr="hero-sub"]') ?? {}, { opacity: 0, y: 16, duration: 0.5, ease: "power2.out" }, 0.5);
      tl.from(q('[data-hr="hero-cue"]') ?? {}, { opacity: 0, duration: 0.45, ease: "none" }, 1.0);
      tl.from(
        q('[data-hr="hero-sticker"]') ?? {},
        { scale: 0, rotate: 46, duration: 0.55, ease: "back.out(2.2)" },
        0.75
      );
      return tl;
    };

    let masterST: ScrollTrigger | null = null;

    const mm = gsap.matchMedia();

    mm.add(
      {
        desktop: "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
        mobile: "(max-width: 768px) and (prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const conditions = ctx.conditions as {
          desktop: boolean;
          mobile: boolean;
          reduced: boolean;
        };

        /* ============================ DESKTOP — pinned scrub ============ */
        if (conditions.desktop) {
          stage.dataset.mode = "desktop";
          heroIntro();

          const hero = sections[0];
          const kineticLine = q('[data-hr="kinetic-line"]');
          const reelSection = sections[2];
          const reelScramble = q('[data-hr="reel-scramble"]');
          const reelCards = qa('[data-hr="reel-card"]');
          const gridSection = sections[3];
          const gridScramble = q('[data-hr="grid-scramble"]');
          const gridCells = qa('[data-hr="grid-cell"]');
          const ctaSection = sections[4];
          const ctaTitle = q('[data-hr="cta-title"]');
          const ctaName = q('[data-hr="cta-name"]');
          const ctaButtons = qa("[data-magnetic]");

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: "+=4200",
              pin: true,
              scrub: true,
              anticipatePin: 1,
              onUpdate: (self) => {
                setProgress(self.progress);
                updateHud(self.progress);
              },
            },
          });

          // ---- hero exit (150→180)
          tl.to(
            hero,
            { opacity: 0, y: -70, duration: at(180) - at(150), ease: "power2.in" },
            at(150)
          );

          // ---- kinetic words
          for (const win of KINETIC_WINDOWS) {
            const wordEl = stage.querySelector<HTMLElement>(
              `[data-hr="kinetic-word"][data-word="${win.word}"]`
            );
            const scrEl = stage.querySelector<HTMLElement>(
              `[data-hr="kinetic-scramble"][data-text="${win.word}"]`
            );
            if (!wordEl || !scrEl) continue;
            tl.fromTo(
              wordEl,
              { opacity: 0, scale: 1.55, skewX: 10 },
              {
                opacity: 1,
                scale: 1,
                skewX: 0,
                duration: at(win.start + 10) - at(win.start),
                ease: "power4.out",
              },
              at(win.start)
            );
            addScramble(tl, scrEl, win.word, win.start, win.start + 12);
            tl.to(
              wordEl,
              {
                opacity: 0,
                scale: 1.3,
                duration: at(win.end) - at(win.end - 10),
                ease: "power2.in",
              },
              at(win.end - 10)
            );
          }
          tl.fromTo(
            kineticLine,
            { opacity: 0, y: 22 },
            {
              opacity: 1,
              y: 0,
              duration: at(320) - at(300),
              ease: "power2.out",
            },
            at(300)
          );
          tl.to(kineticLine, { opacity: 0, duration: at(360) - at(350) }, at(350));

          // ---- reel (360→540)
          tl.fromTo(
            reelSection,
            { opacity: 0, y: 70 },
            {
              opacity: 1,
              y: 0,
              duration: at(380) - at(360),
              ease: "power3.out",
            },
            at(360)
          );
          if (reelScramble) addScramble(tl, reelScramble, "THE REEL", 362, 382);
          reelCards.forEach((card, i) => {
            const start = 385 + i * 10;
            tl.fromTo(
              card,
              { x: i % 2 === 0 ? -620 : 620, opacity: 0, rotate: i % 2 === 0 ? -4 : 4 },
              {
                x: 0,
                opacity: 1,
                rotate: 0,
                duration: at(start + 14) - at(start),
                ease: "expo.out",
              },
              at(start)
            );
          });
          tl.to(
            reelSection,
            { opacity: 0, y: -70, duration: at(540) - at(515), ease: "power2.in" },
            at(515)
          );

          // ---- grid (540→720)
          tl.fromTo(
            gridSection,
            { opacity: 0, y: 70 },
            {
              opacity: 1,
              y: 0,
              duration: at(560) - at(540),
              ease: "power3.out",
            },
            at(540)
          );
          if (gridScramble) addScramble(tl, gridScramble, "THE MACHINE", 542, 562);
          gridCells.forEach((cell, i) => {
            const start = 565 + i * 8;
            tl.fromTo(
              cell,
              { opacity: 0, y: 60, skewX: 9 },
              {
                opacity: 1,
                y: 0,
                skewX: 0,
                duration: at(start + 12) - at(start),
                ease: "power4.out",
              },
              at(start)
            );
          });
          tl.to(
            gridSection,
            { opacity: 0, y: -70, duration: at(720) - at(695), ease: "power2.in" },
            at(695)
          );

          // ---- cta (720→900) — no exit, the film ends here
          tl.fromTo(
            ctaSection,
            { opacity: 0, scale: 0.965 },
            {
              opacity: 1,
              scale: 1,
              duration: at(740) - at(720),
              ease: "power4.out",
            },
            at(720)
          );
          if (ctaTitle) {
            ctaTitle.textContent = scrambleText("READY TO FLINCH?", 0);
            const proxy = { p: 0 };
            tl.to(
              proxy,
              {
                p: 1,
                duration: at(748) - at(724),
                onUpdate: () => {
                  ctaTitle.textContent = scrambleText("READY TO FLINCH?", proxy.p);
                },
              },
              at(724)
            );
          }
          tl.from(
            ctaName,
            { opacity: 0, y: 26, duration: at(775) - at(750), ease: "power3.out" },
            at(750)
          );
          ctaButtons.forEach((btn, i) => {
            tl.from(
              btn,
              {
                opacity: 0,
                y: 34,
                duration: at(795 + i * 8) - at(775 + i * 8),
                ease: "back.out(1.8)",
              },
              at(775 + i * 8)
            );
          });

          masterST = tl.scrollTrigger ?? null;
        }

        /* ============================ MOBILE — flow acts ================= */
        if (conditions.mobile) {
          stage.dataset.mode = "mobile";
          heroIntro();

          ScrollTrigger.create({
            trigger: stage,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              setProgress(self.progress);
              updateHud(self.progress);
            },
          });

          // kinetic — words stack + scramble in view
          const kineticSection = sections[1];
          const words = qa('[data-hr="kinetic-word"]');
          const scrambles = qa('[data-hr="kinetic-scramble"]');
          const ktl = gsap.timeline({
            scrollTrigger: { trigger: kineticSection, start: "top 70%" },
          });
          ktl.fromTo(
            words,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, stagger: 0.13, duration: 0.5, ease: "power3.out" }
          );
          scrambles.forEach((el, i) => {
            const text = el.dataset.text ?? "";
            const proxy = { p: 0 };
            ktl.to(
              proxy,
              {
                p: 1,
                duration: 0.45,
                onUpdate: () => {
                  el.textContent = scrambleText(text, proxy.p);
                },
              },
              0.08 + i * 0.13
            );
          });
          ktl.fromTo(
            q('[data-hr="kinetic-line"]'),
            { opacity: 0 },
            { opacity: 1, duration: 0.4 },
            0.6
          );

          // reel / grid / cta reveals
          const reveal = (section: Element, sel: string) => {
            const items = Array.from(section.querySelectorAll(sel));
            const stl = gsap.timeline({
              scrollTrigger: { trigger: section, start: "top 72%" },
            });
            stl.fromTo(section.children, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" });
            if (items.length > 0) {
              stl.fromTo(
                items,
                { opacity: 0, y: 34 },
                { opacity: 1, y: 0, stagger: 0.09, duration: 0.5, ease: "power3.out" },
                0.15
              );
            }
          };
          reveal(sections[2], '[data-hr="reel-card"]');
          reveal(sections[3], '[data-hr="grid-cell"]');
          reveal(sections[4], "[data-magnetic]");

          const reelScr = q('[data-hr="reel-scramble"]');
          const gridScr = q('[data-hr="grid-scramble"]');
          if (reelScr) {
            const proxy = { p: 0 };
            gsap.to(proxy, {
              p: 1,
              duration: 0.7,
              scrollTrigger: { trigger: sections[2], start: "top 72%" },
              onUpdate: () => {
                reelScr.textContent = scrambleText("THE REEL", proxy.p);
              },
            });
          }
          if (gridScr) {
            const proxy = { p: 0 };
            gsap.to(proxy, {
              p: 1,
              duration: 0.7,
              scrollTrigger: { trigger: sections[3], start: "top 72%" },
              onUpdate: () => {
                gridScr.textContent = scrambleText("THE MACHINE", proxy.p);
              },
            });
          }
        }

        /* ============================ REDUCED MOTION ===================== */
        if (conditions.reduced) {
          stage.dataset.mode = "reduced";
          setProgress(0.04);
          if (hudFrame) {
            hudFrame.textContent = "F 0036 / 900 · 0:01";
          }
          // static hero + simple fades for the rest
          sections.slice(1).forEach((section) => {
            gsap.fromTo(
              section,
              { opacity: 0.02 },
              {
                opacity: 1,
                duration: 0.9,
                ease: "none",
                scrollTrigger: { trigger: section, start: "top 90%" },
              }
            );
          });
        }
      }
    );

    // ---- deep-scroll bridge (nav + HUD dots)
    const onSeek = (e: Event) => {
      const idx = Math.min(4, Math.max(0, (e as CustomEvent<number>).detail));
      if (masterST) {
        const targetProgress = (ACTS[idx].frameStart + 10) / DURATION_IN_FRAMES;
        const y =
          masterST.start + (masterST.end - masterST.start) * targetProgress;
        window.scrollTo({ top: y, behavior: "smooth" });
      } else {
        sections[idx]?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }
    };
    window.addEventListener(SEEK_ACT_EVENT, onSeek);

    return () => {
      window.removeEventListener(SEEK_ACT_EVENT, onSeek);
      mm.revert();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="acts-stage relative h-screen w-full"
      data-mode="desktop"
    >
      <HeroOverlay />
      <KineticOverlay />
      <ReelOverlay />
      <GridOverlay />
      <CtaOverlay />
      <Hud />
    </div>
  );
};

export default ScrollCinematic;
