"use client";

import React, { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { usePlayback } from "./PlaybackContext";

/**
 * Volume — custom control with an AnimatePresence popup and a
 * pointer-drag vertical slider writing straight to playerRef.setVolume.
 */
export const VolumeControl: React.FC = () => {
  const { volume, setVolume } = usePlayback();
  const [open, setOpen] = useState(false);
  const lastVolume = useRef(0.8);

  const muted = volume === 0;

  const toggleMute = () => {
    if (muted) {
      setVolume(lastVolume.current || 0.8);
    } else {
      lastVolume.current = volume;
      setVolume(0);
    }
  };

  const trackRef = useRef<HTMLDivElement>(null);

  const volumeFromClientY = (clientY: number): number => {
    const track = trackRef.current;
    if (!track) return volume;
    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* stale/synthetic pointer — drag still works via move handlers */
    }
    setVolume(volumeFromClientY(e.clientY));
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setVolume(volumeFromClientY(e.clientY));
  };

  // keyboard: arrows / page / home / end — the slider is fully operable
  const onTrackKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "PageUp" || e.key === "PageDown" ? 0.2 : 0.05;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowUp": next = volume + step; break;
      case "ArrowDown": next = volume - step; break;
      case "PageUp": next = volume + step; break;
      case "PageDown": next = volume - step; break;
      case "Home": next = 0; break;
      case "End": next = 1; break;
      default: return;
    }
    e.preventDefault();
    setVolume(Math.min(1, Math.max(0, next)));
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="grid h-10 w-10 place-items-center rounded-full text-chrome/80 transition-colors hover:bg-chrome/10 hover:text-chrome focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-12 right-0 rounded-xl border border-chrome/15 bg-ink-soft/95 p-3 shadow-2xl backdrop-blur"
            role="group"
            aria-label="Volume slider"
          >
            <div
              ref={trackRef}
              onPointerDown={onTrackPointerDown}
              onPointerMove={onTrackPointerMove}
              onKeyDown={onTrackKeyDown}
              role="slider"
              tabIndex={0}
              aria-label="Volume"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              aria-valuetext={`${Math.round(volume * 100)}% volume`}
              className="relative h-24 w-2 cursor-pointer touch-none overflow-hidden rounded-full bg-chrome/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-full bg-acid"
                style={{ height: `${volume * 100}%` }}
              />
            </div>
            <p className="mono-label mt-2 text-center text-[9px] text-chrome/60">
              {Math.round(volume * 100)}%
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default VolumeControl;
