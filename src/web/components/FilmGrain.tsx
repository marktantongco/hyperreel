"use client";

import React from "react";

/**
 * Fixed DOM film-grain layer: SVG feTurbulence, mix-blend-overlay,
 * opacity .07, pointer-events-none. Chrome only — never inside a canvas.
 */
export const FilmGrain: React.FC = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-[70] opacity-[0.07] mix-blend-overlay"
  >
    <svg width="100%" height="100%">
      <filter id="hyperreel-film-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} />
      </filter>
      <rect width="100%" height="100%" filter="url(#hyperreel-film-grain)" />
    </svg>
  </div>
);

export default FilmGrain;
