"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ACTS, clamp01, formatFramesAsTime } from "@/shared/acts";
import { usePlayback } from "./PlaybackContext";

/**
 * Custom scrubber — layout-animated, drag → playerRef.seekTo,
 * chapter ticks from the shared act table. Keyboard accessible.
 */
export const Scrubber: React.FC = () => {
  const { frame, durationInFrames, seekTo } = usePlayback();
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragFrame, setDragFrame] = useState<number | null>(null);

  const displayFrame = dragFrame ?? frame;
  const ratio = clamp01(displayFrame / durationInFrames);

  const frameFromClientX = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return displayFrame;
    const rect = track.getBoundingClientRect();
    return Math.round(clamp01((clientX - rect.left) / rect.width) * durationInFrames);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Guard: setPointerCapture throws NotFoundError for synthetic/stale
    // pointer ids (headless browsers, rapid taps). Drag still works via
    // move/up handlers; capture is an optimization, not a requirement.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone — drag continues without capture */
    }
    const f = frameFromClientX(e.clientX);
    setDragFrame(f);
    seekTo(f);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragFrame === null) return;
    const f = frameFromClientX(e.clientX);
    setDragFrame(f);
    seekTo(f);
  };

  const onPointerUp = () => setDragFrame(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" ? 30 : e.key === "ArrowDown" ? -30 : 0;
    if (step === 0) return;
    e.preventDefault();
    const f = Math.min(durationInFrames - 1, Math.max(0, displayFrame + step));
    setDragFrame(f);
    seekTo(f);
  };

  return (
    <div className="group relative flex min-w-0 flex-1 items-center px-1 py-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={durationInFrames}
        aria-valuenow={displayFrame}
        aria-valuetext={formatFramesAsTime(displayFrame)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="relative h-2 w-full cursor-pointer touch-none rounded-full bg-chrome/15 transition-[height] duration-200 group-hover:h-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
      >
        {/* chapter ticks */}
        {ACTS.map((act) => (
          <span
            key={act.id}
            className="pointer-events-none absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full opacity-80"
            style={{
              left: `${(act.frameStart / durationInFrames) * 100}%`,
              background: act.color,
            }}
            aria-hidden
          />
        ))}
        {/* fill */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-acid"
          style={{ width: `${ratio * 100}%` }}
        />
        {/* thumb */}
        <motion.div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-acid shadow-[0_0_16px_rgba(198,255,61,0.55)]"
          animate={{
            left: `${ratio * 100}%`,
            scale: dragFrame !== null ? 1.25 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      </div>
    </div>
  );
};

export default Scrubber;
