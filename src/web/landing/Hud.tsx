"use client";

import React, { useEffect, useState } from "react";
import { ACTS } from "@/shared/acts";
import { subscribeAct } from "./progressStore";
import { scrollToAct } from "./actNavigation";

/**
 * Cinematic HUD — frame counter + act label + chapter rail.
 * The frame counter is written directly by the GSAP timeline (no setState);
 * the act label/dots re-render only when the act CHANGES (max 4 times).
 * Rail dots are real buttons: they deep-scroll the cinematic.
 */
export const Hud: React.FC = () => {
  const [actIndex, setActIndex] = useState(0);

  useEffect(() => subscribeAct(setActIndex), []);

  const act = ACTS[actIndex];

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className="mono-label absolute bottom-5 left-4 text-[10px] text-chrome/70 sm:bottom-6 sm:left-6">
        <span data-hr="hud-frame" suppressHydrationWarning>
          F 0000 / 900 · 0:00
        </span>
      </div>
      <div
        className="mono-label absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[10px] sm:bottom-6 md:flex"
        style={{ color: act.color }}
      >
        <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full" style={{ background: act.color }} />
        ACT 0{actIndex + 1} — {act.label}
      </div>

      {/* chapter rail */}
      <div className="pointer-events-auto absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 sm:right-3">
        {ACTS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => scrollToAct(i)}
            aria-label={`Jump to ${a.label} act`}
            className="group flex h-6 w-6 items-center justify-center"
          >
            <span
              data-hr="rail-segment"
              className="block h-5 w-1 rounded-full transition-colors duration-300 group-hover:h-7"
              style={{
                background:
                  i <= actIndex ? a.color : "rgba(232,232,236,0.18)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Hud;
