import React from "react";

/**
 * Rotated pill sticker badge (GENZ sticker chrome).
 */
interface StickerBadgeProps {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  variant?: "acid" | "coral" | "chrome";
}

const variants: Record<NonNullable<StickerBadgeProps["variant"]>, string> = {
  acid: "border-acid text-acid",
  coral: "border-coral text-coral",
  chrome: "border-chrome/70 text-chrome",
};

export const StickerBadge: React.FC<StickerBadgeProps> = ({
  children,
  className,
  rotate = -6,
  variant = "acid",
}) => (
  <span
    className={`mono-label inline-block select-none rounded-full border-[3px] px-4 py-1.5 text-[10px] font-bold tracking-[0.28em] ${variants[variant]} ${className ?? ""}`}
    style={{ transform: `rotate(${rotate}deg)` }}
  >
    {children}
  </span>
);

export default StickerBadge;
