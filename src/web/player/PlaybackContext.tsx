"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PlayerRef } from "@remotion/player";
import type { PlaybackApi } from "@/shared/PlaybackContext";
import { DURATION_IN_FRAMES } from "@/shared/acts";

/**
 * Playback bridge — React Context around the @remotion/player <Player>.
 * The Player renders with controls={false}; the ENTIRE control surface is
 * custom chrome. State flows through this context (subscribed to the
 * PlayerRef events 'frameupdate' / 'play' / 'pause' / 'volumechange'),
 * never by wrapping the video element itself.
 */

const PlaybackContext = createContext<PlaybackApi | null>(null);
const PlayerRefContext = createContext<React.MutableRefObject<PlayerRef | null> | null>(null);

export function usePlayback(): PlaybackApi {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used inside <PlaybackProvider>");
  }
  return ctx;
}

/** The raw PlayerRef — used only by the surface that mounts <Player>. */
export function usePlayerRefSlot(): React.MutableRefObject<PlayerRef | null> {
  const ctx = useContext(PlayerRefContext);
  if (!ctx) {
    throw new Error("usePlayerRefSlot must be used inside <PlaybackProvider>");
  }
  return ctx;
}

interface Attach {
  attach: (ref: PlayerRef) => void;
}

const AttachContext = createContext<Attach | null>(null);

/** Mount surface: renders the Player and registers it with the provider. */
export function usePlayerAttach(): (ref: PlayerRef | null) => void {
  const attach = useContext(AttachContext);
  const slotRef = usePlayerRefSlot();
  return useCallback(
    (ref: PlayerRef | null) => {
      slotRef.current = ref;
      if (ref && attach) attach.attach(ref);
    },
    [attach, slotRef]
  );
}

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const playerRef = useRef<PlayerRef | null>(null);
  const [attached, setAttached] = useState<PlayerRef | null>(null);
  const [frame, setFrame] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(1);

  useEffect(() => {
    const ref = attached;
    if (!ref) return;
    const onFrameUpdate = (e: { detail: { frame: number } }) => setFrame(e.detail.frame);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVolumeChange = (e: { detail: { volume: number } }) => setVolumeState(e.detail.volume);

    ref.addEventListener("frameupdate", onFrameUpdate);
    ref.addEventListener("play", onPlay);
    ref.addEventListener("pause", onPause);
    ref.addEventListener("volumechange", onVolumeChange);

    return () => {
      ref.removeEventListener("frameupdate", onFrameUpdate);
      ref.removeEventListener("play", onPlay);
      ref.removeEventListener("pause", onPause);
      ref.removeEventListener("volumechange", onVolumeChange);
    };
  }, [attached]);

  const attach = useCallback((ref: PlayerRef) => {
    playerRef.current = ref;
    setAttached(ref);
  }, []);

  const api = useMemo<PlaybackApi>(
    () => ({
      frame,
      isPlaying,
      volume,
      durationInFrames: DURATION_IN_FRAMES,
      togglePlay: () => attached?.toggle(),
      seekTo: (f: number) => attached?.seekTo(Math.round(f)),
      setVolume: (v: number) => attached?.setVolume(Math.min(1, Math.max(0, v))),
      setFrame: (f: number) => attached?.seekTo(Math.round(f)),
    }),
    [attached, frame, isPlaying, volume]
  );

  const attachValue = useMemo(() => ({ attach }), [attach]);

  return (
    <AttachContext.Provider value={attachValue}>
      <PlayerRefContext.Provider value={playerRef}>
        <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>
      </PlayerRefContext.Provider>
    </AttachContext.Provider>
  );
};

export default PlaybackProvider;
