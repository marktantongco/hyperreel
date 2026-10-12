import type { NextConfig } from "next";

/**
 * HYPERREEL Next config.
 *
 * Default: standalone output for self-hosted / Vercel deploys.
 * GitHub Pages path: NEXT_OUTPUT=export switches to a static export with
 * basePath /hyperreel (scripts/hyperreel-build-pages.sh drives it).
 */
const isPagesExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = isPagesExport
  ? {
      output: "export",
      basePath: "/hyperreel",
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: false,
    }
  : {
      output: "standalone",
      typescript: { ignoreBuildErrors: true },
      reactStrictMode: false,
      // Remotion's bundler/renderer must stay OUTSIDE the Next server
      // bundle: their Node-side require graphs pull optional native deps
      // (headless Chrome, whisper-webgpu) that only exist at render time.
      // With them external, `await import("@remotion/bundler")` resolves
      // from node_modules at runtime and failures degrade gracefully
      // (RenderJob → status "unavailable" with an actionable message).
      serverExternalPackages: [
        "@remotion/bundler",
        "@remotion/renderer",
        "@remotion/studio",
      ],
    };

export default nextConfig;
