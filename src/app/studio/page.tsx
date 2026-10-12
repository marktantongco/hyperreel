import type { Metadata } from "next";
import { StudioView } from "@/web/player/StudioView";

export const metadata: Metadata = {
  title: "HYPERREEL STUDIO — THE REEL",
  description:
    "The HYPERREEL cinematic as a programmatic Remotion composition: custom player, chapter markers, personalization, server-side MP4 rendering.",
  openGraph: {
    title: "HYPERREEL STUDIO — THE REEL",
    description:
      "One choreography, two renderers. Scrub the 30s 3D reel, put your name in it, render it server-side.",
    siteName: "HYPERREEL",
    type: "website",
  },
};

export default function StudioPage() {
  return <StudioView />;
}
