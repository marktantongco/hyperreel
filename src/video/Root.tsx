import React from "react";
import { Composition, Sequence, Still } from "remotion";
import { HyperReelComposition, type HyperReelProps } from "./HyperReelComposition";
import {
  DURATION_IN_FRAMES,
  FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "../shared/acts";

/**
 * Remotion composition registry.
 * - HyperReel: the full 30s cinematic (900 frames @ 30fps, 1920x1080)
 *   with inputProps { name } for personalized renders.
 * - HyperReelPoster: a one-frame Still that shows the film at frame 150
 *   (the hero high point) via a Sequence offset — used for OG fallback /
 *   `npx remotion still src/video/index.ts HyperReelPoster poster.png`.
 */

/** Freezes the film at frame 150 inside a 1-frame composition. */
const PosterFrame: React.FC<HyperReelProps> = (props) => (
  <Sequence from={150} durationInFrames={1} layout="none" name="Poster @150">
    <HyperReelComposition {...props} />
  </Sequence>
);

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HyperReel"
      component={HyperReelComposition}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={{ name: "YOU" }}
    />
    <Still
      id="HyperReelPoster"
      component={PosterFrame}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={{ name: "YOU" }}
    />
  </>
);

export default RemotionRoot;
