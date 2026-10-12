"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom cursor — motion springs, mix-blend-difference, grows on
 * interactive hover ([data-magnetic], a, button, input).
 * Disabled on coarse pointers / reduced motion.
 */
export const CustomCursor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 520, damping: 34, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 520, damping: 34, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    document.documentElement.setAttribute("data-custom-cursor", "on");
    // enable after first paint (deferred — never a synchronous effect setState)
    const raf = requestAnimationFrame(() => setEnabled(true));

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const target = e.target as HTMLElement | null;
      setHovering(
        Boolean(
          target?.closest(
            "a, button, input, textarea, select, label, [data-magnetic], [role='button'], [role='slider']"
          )
        )
      );
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    const leave = () => setVisible(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.removeAttribute("data-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [x, y]);

  if (!enabled) return null;

  const size = hovering ? 52 : 20;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] mix-blend-difference"
      style={{ x: sx, y: sy }}
    >
      <motion.div
        className="rounded-full border-2 border-white bg-white"
        animate={{
          width: size,
          height: size,
          opacity: visible ? (hovering ? 0.95 : 0.8) : 0,
          scale: pressed ? 0.7 : 1,
          backgroundColor: hovering ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.9)",
        }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        style={{ translateX: "-50%", translateY: "-50%" }}
      />
    </motion.div>
  );
};

export default CustomCursor;
