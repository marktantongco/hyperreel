import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

/**
 * Remotion CLI entry point.
 *   remotion studio src/video/index.ts
 *   remotion render src/video/index.ts HyperReel out/hyperreel.mp4
 */
registerRoot(RemotionRoot);
