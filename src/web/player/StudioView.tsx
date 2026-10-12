"use client";

import React from "react";
import { Nav } from "@/web/components/Nav";
import { Footer } from "@/web/components/Footer";
import { CustomCursor } from "@/web/components/CustomCursor";
import { FilmGrain } from "@/web/components/FilmGrain";
import { StickerBadge } from "@/web/components/StickerBadge";
import { StudioPlayer } from "@/web/player/StudioPlayer";
import { Marquee } from "@/web/components/Marquee";

/**
 * /studio — the programmatic-video player page.
 * Custom player chrome (framer-motion) around a real Remotion composition.
 */
export const StudioView: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink text-chrome">
    <CustomCursor />
    <FilmGrain />
    <Nav />

    <main className="relative z-10 mx-auto w-full max-w-[1400px] flex-1 px-4 pb-10 pt-24 sm:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3">
            <StickerBadge variant="coral" rotate={-3}>
              THE PROGRAMMATIC REEL
            </StickerBadge>
          </div>
          <h1 className="display-headline text-[clamp(2.2rem,5vw,4rem)]">
            THE <span className="text-acid">REEL</span>
          </h1>
          <p className="mono-label mt-3 text-[10px] text-chrome/60">
            ONE CHOREOGRAPHY · TWO RENDERERS · 900 FRAMES · YOUR NAME IN THE FILM
          </p>
        </div>
        <p className="max-w-xs text-xs leading-relaxed text-chrome/55">
          The same deterministic 3D scene bundles that power the landing cinematic,
          rendered here as a real Remotion composition — scrubbable, chaptered,
          personalizable, and server-renderable to MP4.
        </p>
      </div>

      <StudioPlayer />

      <Marquee
        text="PROGRAMMATIC VIDEO · REMOTION · REAL-TIME 3D"
        className="mt-10 border-y border-chrome/10 py-2 text-chrome/40"
      />
    </main>

    <Footer />
  </div>
);

export default StudioView;
