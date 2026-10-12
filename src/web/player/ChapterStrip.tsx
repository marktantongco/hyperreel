"use client";

import React from "react";
import { motion } from "framer-motion";
import { ACTS, formatFramesAsTime } from "@/shared/acts";
import { usePlayback } from "./PlaybackContext";

/**
 * Chapter markers — the shared act table becomes real seek buttons
 * (used by both the chapter strip and the act rail).
 */
export const ChapterStrip: React.FC = () => {
  const { frame, durationInFrames, seekTo } = usePlayback();

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Chapters"
    >
      {ACTS.map((act, i) => {
        const active = frame >= act.frameStart && frame < act.frameEnd;
        return (
          <motion.button
            key={act.id}
            role="tab"
            aria-selected={active}
            whileTap={{ scale: 0.95 }}
            onClick={() => seekTo(act.frameStart)}
            className="mono-label group flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
            style={{
              borderColor: active ? act.color : "rgba(232,232,236,0.18)",
              color: active ? act.color : "rgba(232,232,236,0.75)",
            }}
            aria-label={`Seek to chapter ${act.label} at ${formatFramesAsTime(act.frameStart)}`}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: act.color }}
              aria-hidden
            />
            <span className="hidden sm:inline">0{i + 1}</span>
            {act.label}
            <span className="hidden text-chrome/40 md:inline">
              {formatFramesAsTime(act.frameStart)}
            </span>
          </motion.button>
        );
      })}
      <span className="mono-label ml-auto hidden text-[9px] text-chrome/40 lg:inline">
        {durationInFrames} FRAMES · 30FPS · 1920×1080
      </span>
    </div>
  );
};

export default ChapterStrip;
