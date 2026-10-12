"use client";

import React from "react";
import { LiveCanvas } from "@/web/canvas/LiveCanvas";
import { ScrollCinematic } from "@/web/landing/ScrollCinematic";
import { TheatreRig } from "@/web/landing/TheatreRig";
import { Nav } from "@/web/components/Nav";
import { Footer } from "@/web/components/Footer";
import { CustomCursor } from "@/web/components/CustomCursor";
import { FilmGrain } from "@/web/components/FilmGrain";

/**
 * HYPERREEL landing — the scroll-stopper.
 *
 * Fixed r3f canvas (the interactive twin of the Remotion composition)
 * behind a pinned, scroll-scrubbed 5-act cinematic. Framer Motion owns
 * nav/cursor chrome only; GSAP + Three.js own every cinematic pixel.
 */
export const Landing: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-ink text-chrome">
    <LiveCanvas />
    <TheatreRig />
    <CustomCursor />
    <FilmGrain />
    <Nav />
    <main className="relative z-10 flex-1">
      <ScrollCinematic />
    </main>
    <Footer />
  </div>
);

export default Landing;
