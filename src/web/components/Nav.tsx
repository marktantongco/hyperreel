"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { StickerBadge } from "./StickerBadge";
import { scrollToAct } from "@/web/landing/actNavigation";

/**
 * Fixed top nav — DOM chrome (framer-motion land).
 * THE REEL deep-scrolls the landing cinematic to the reel act;
 * STUDIO opens the /studio player page (client-side);
 * CONTACT is a mailto.
 */
export const Nav: React.FC = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();
  const onLanding = pathname === "/";

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <nav className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/"
          className="display-headline text-lg tracking-tight text-chrome transition-colors hover:text-acid sm:text-xl"
          aria-label="HYPERREEL home"
        >
          HYPER<span className="text-acid">REEL</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <ul className="flex items-center gap-1 sm:gap-4" onMouseLeave={() => setHovered(null)}>
            <li className="relative">
              {onLanding ? (
                <button
                  onClick={() => scrollToAct(2)}
                  onMouseEnter={() => setHovered("reel")}
                  onFocus={() => setHovered("reel")}
                  className="mono-label px-2 py-2 text-[10px] text-chrome/85 transition-colors hover:text-chrome sm:text-[11px]"
                  aria-label="Scroll the cinematic to the reel act"
                >
                  THE REEL
                  <span
                    className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left bg-acid transition-transform duration-300"
                    style={{ transform: hovered === "reel" ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </button>
              ) : (
                <Link
                  href="/"
                  onMouseEnter={() => setHovered("reel")}
                  onFocus={() => setHovered("reel")}
                  className="mono-label px-2 py-2 text-[10px] text-chrome/85 transition-colors hover:text-chrome sm:text-[11px]"
                  aria-label="Back to the landing cinematic"
                >
                  THE REEL
                  <span
                    className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left bg-acid transition-transform duration-300"
                    style={{ transform: hovered === "reel" ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </Link>
              )}
            </li>
            <li className="relative">
              <Link
                href="/studio"
                onMouseEnter={() => setHovered("studio")}
                onFocus={() => setHovered("studio")}
                className="mono-label px-2 py-2 text-[10px] text-chrome/85 transition-colors hover:text-chrome sm:text-[11px]"
                aria-label="Open the studio player"
              >
                STUDIO
                <span
                  className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left bg-acid transition-transform duration-300"
                  style={{ transform: hovered === "studio" ? "scaleX(1)" : "scaleX(0)" }}
                />
              </Link>
            </li>
            <li className="relative">
              <a
                href="mailto:studio@hyperreel.example"
                onMouseEnter={() => setHovered("contact")}
                onFocus={() => setHovered("contact")}
                className="mono-label px-2 py-2 text-[10px] text-chrome/85 transition-colors hover:text-chrome sm:text-[11px]"
                aria-label="Email the studio"
              >
                CONTACT
                <span
                  className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 origin-left bg-coral transition-transform duration-300"
                  style={{ transform: hovered === "contact" ? "scaleX(1)" : "scaleX(0)" }}
                />
              </a>
            </li>
          </ul>
          <div className="hidden sm:block">
            <StickerBadge variant="acid" rotate={4}>
              60FPS OR NOTHING
            </StickerBadge>
          </div>
        </div>
      </nav>
    </motion.header>
  );
};

export default Nav;
