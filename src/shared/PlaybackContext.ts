/**
 * Playback context types shared between the player chrome (src/web/player)
 * and any consumer that needs frame / transport state.
 * The React Context itself lives in src/web/player — only types here,
 * so video code can import types without pulling React runtime deps.
 */

export interface PlaybackState {
  /** current frame (0..durationInFrames) */
  frame: number;
  isPlaying: boolean;
  /** 0..1 */
  volume: number;
  durationInFrames: number;
}

export interface PlaybackApi extends PlaybackState {
  togglePlay: () => void;
  seekTo: (frame: number) => void;
  setVolume: (volume: number) => void;
  /** seek to an exact frame and keep it paused-ish (preview scrub) */
  setFrame: (frame: number) => void;
}
