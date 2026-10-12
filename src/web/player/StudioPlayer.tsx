"use client";

import React, { useEffect, useState } from "react";
import { Player } from "@remotion/player";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize, Pause, Play } from "lucide-react";
import { HyperReelComposition } from "@/video/HyperReelComposition";
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  formatFramesAsTime,
} from "@/shared/acts";
import {
  PlaybackProvider,
  usePlayback,
  usePlayerAttach,
  usePlayerRefSlot,
} from "./PlaybackContext";
import { Scrubber } from "./Scrubber";
import { VolumeControl } from "./VolumeControl";
import { ChapterStrip } from "./ChapterStrip";
import { LikeButton } from "./LikeButton";
import { RenderPanel } from "./RenderPanel";

/**
 * StudioPlayer — a fully custom chrome over @remotion/player.
 * <Player controls={false}>; every control (play, scrub, volume, chapters,
 * fullscreen) is ours and talks to the PlayerRef through the
 * PlaybackProvider context. Framer Motion animates the chrome ONLY —
 * it never wraps or animates the Player element itself.
 */

const NAME_KEY = "hyperreel-name";

/* -------------------------------------------------------------- surface */
const PlayerSurface: React.FC<{ name: string }> = ({ name }) => {
  const attachRef = usePlayerAttach();
  return (
    <Player
      ref={attachRef}
      component={HyperReelComposition}
      inputProps={{ name: name.trim() || "YOU" }}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      compositionWidth={VIDEO_WIDTH}
      compositionHeight={VIDEO_HEIGHT}
      style={{ width: "100%", height: "100%" }}
      controls={false}
      loop
      acknowledgeRemotionLicense
    />
  );
};

/* ----------------------------------------------------------- big overlay */
const PlayOverlay: React.FC = () => {
  const { isPlaying, togglePlay, frame } = usePlayback();
  return (
    <AnimatePresence>
      {!isPlaying ? (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={togglePlay}
          className="absolute inset-0 z-10 grid place-items-center bg-ink/40 backdrop-blur-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
          aria-label="Play the reel"
        >
          <motion.span
            initial={{ scale: 0.7, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="grid h-20 w-20 place-items-center rounded-full bg-acid text-ink shadow-[0_0_44px_rgba(198,255,61,0.45)]"
          >
            <Play size={32} fill="currentColor" strokeWidth={0} />
          </motion.span>
          <span className="mono-label absolute bottom-20 text-[10px] text-chrome/80">
            F {String(Math.round(frame)).padStart(4, "0")} · TAP TO PLAY · {formatFramesAsTime(frame)}
          </span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------- controls */
const ControlsBar: React.FC = () => {
  const { frame, isPlaying, togglePlay, durationInFrames } = usePlayback();
  const playerRef = usePlayerRefSlot();

  return (
    <div className="mt-2 flex items-center gap-1 sm:gap-2">
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-acid text-ink transition-shadow hover:shadow-[0_0_20px_rgba(198,255,61,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
      >
        {isPlaying ? (
          <Pause size={16} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={16} fill="currentColor" strokeWidth={0} />
        )}
      </motion.button>

      <span className="mono-label shrink-0 text-[10px] tabular-nums text-chrome/75">
        {formatFramesAsTime(frame)} / {formatFramesAsTime(durationInFrames)}
      </span>

      <Scrubber />

      <VolumeControl />

      <button
        onClick={() => playerRef.current?.requestFullscreen()}
        aria-label="Fullscreen"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-chrome/80 transition-colors hover:bg-chrome/10 hover:text-chrome focus-visible:outline focus-visible:outline-2 focus-visible:outline-acid"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------ name field */
const NameField: React.FC<{ name: string; setName: (v: string) => void }> = ({
  name,
  setName,
}) => (
  <div className="rounded-2xl border border-chrome/15 bg-ink-soft/60 p-5">
    <label
      htmlFor="hyperreel-name"
      className="mono-label text-[10px] text-chrome"
    >
      PUT YOUR NAME IN THE FILM
    </label>
    <input
      id="hyperreel-name"
      value={name}
      maxLength={18}
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => {
        const v = e.target.value;
        setName(v);
        window.localStorage.setItem(NAME_KEY, v);
      }}
      placeholder="YOU"
      className="mt-3 w-full rounded-xl border border-chrome/20 bg-ink/80 px-4 py-3 text-lg font-bold uppercase tracking-tight text-chrome outline-none transition-colors placeholder:text-chrome/30 focus:border-acid"
    />
    <p className="mono-label mt-3 text-[9px] leading-relaxed text-chrome/50">
      CTA ACT · LIVE →{" "}
      <span className="text-coral">
        {(name.trim() || "YOU").toUpperCase()}, LET&apos;S MAKE IT MOVE.
      </span>
    </p>
  </div>
);

/* ---------------------------------------------------------------- studio */
export const StudioPlayer: React.FC = () => {
  const [name, setName] = useState("YOU");

  useEffect(() => {
    const stored = window.localStorage.getItem(NAME_KEY);
    if (!stored || stored.trim().length === 0) return;
    // deferred (rAF) so hydration stays stable and no sync effect setState
    const raf = requestAnimationFrame(() => setName(stored));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <PlaybackProvider>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-chrome/15 bg-ink shadow-[0_0_80px_rgba(198,255,61,0.08)]">
            <PlayerSurface name={name} />
            <PlayOverlay />
          </div>
          <ControlsBar />
          <div className="mt-3">
            <ChapterStrip />
          </div>
        </div>

        <aside className="min-w-0 space-y-5">
          <NameField name={name} setName={setName} />
          <div>
            <h3 className="mono-label mb-3 text-[10px] text-chrome/60">REACTIONS</h3>
            <LikeButton />
          </div>
          <RenderPanel name={name.trim() || "YOU"} />
        </aside>
      </div>
    </PlaybackProvider>
  );
};

export default StudioPlayer;
