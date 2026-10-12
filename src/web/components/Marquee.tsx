import React from "react";

/**
 * Kinetic marquee strip — CSS-keyframe infinite scroll (DOM chrome only,
 * never inside the video canvas where transforms are frame-derived).
 */
interface MarqueeProps {
  text: string;
  className?: string;
  separator?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({
  text,
  className,
  separator = "✦",
}) => {
  const unit = `${text} ${separator} `;
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      aria-hidden
    >
      <div className="flex w-max animate-marquee whitespace-nowrap will-change-transform">
        <span className="mono-label text-xs">{unit.repeat(6)}</span>
        <span className="mono-label text-xs">{unit.repeat(6)}</span>
      </div>
    </div>
  );
};

export default Marquee;
