"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";

/**
 * Magnetic button — real pointer-tracking spring math.
 * The wrapper gravitates toward the pointer while it hovers inside the
 * hit area and springs back on leave; the inner element stays semantic
 * (a / Link / button) and focusable.
 */

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  /** magnet pull factor 0..1 */
  strength?: number;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  ariaLabel?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export const Magnetic: React.FC<MagneticProps> = ({
  children,
  className,
  strength = 0.32,
  onClick,
  href,
  external,
  ariaLabel,
  type = "button",
  disabled,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 });

  const handleMove = (e: React.PointerEvent) => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const isExternalLink =
    href !== undefined && (external || href.startsWith("mailto:") || href.startsWith("http"));

  return (
    <motion.div
      ref={ref}
      data-magnetic
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      className="inline-block"
    >
      {href ? (
        isExternalLink ? (
          <a
            href={href}
            aria-label={ariaLabel}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer noopener" : undefined}
            className={className}
            data-magnetic
          >
            {children}
          </a>
        ) : (
          <Link href={href} aria-label={ariaLabel} className={className} data-magnetic>
            {children}
          </Link>
        )
      ) : (
        <button
          type={type}
          aria-label={ariaLabel}
          onClick={onClick}
          disabled={disabled}
          className={className}
          data-magnetic
        >
          {children}
        </button>
      )}
    </motion.div>
  );
};

export default Magnetic;
