import React from "react";
import { Marquee } from "./Marquee";

/**
 * Footer — sticks to the bottom via the root flex column (mt-auto).
 */
export const Footer: React.FC = () => (
  <footer className="relative z-10 mt-auto border-t border-chrome/10 bg-ink/80 backdrop-blur-sm">
    <Marquee
      text="WE MAKE THE INTERNET FLINCH"
      className="border-b border-chrome/10 py-2 text-chrome/50"
    />
    <div className="flex flex-col items-center justify-between gap-2 px-4 py-5 text-center sm:flex-row sm:px-8">
      <p className="mono-label text-[10px] text-chrome/70">
        HYPERREEL © 2026 · MADE AT 60FPS · EST. 2026
      </p>
      <p className="mono-label text-[10px] text-chrome/40">
        ACID ON INK · CHROME ON EVERYTHING
      </p>
    </div>
  </footer>
);

export default Footer;
