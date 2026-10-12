import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "HYPERREEL STUDIO — THE REEL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static OG image for the studio page. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0B0B0C",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 18,
              height: 18,
              backgroundColor: "#FF4D2E",
              borderRadius: 999,
              display: "flex",
            }}
          />
          <div
            style={{
              color: "#E8E8EC",
              fontSize: 30,
              letterSpacing: 8,
              fontWeight: 700,
              display: "flex",
            }}
          >
            HYPERREEL STUDIO
          </div>
        </div>

        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ color: "#C6FF3D", display: "flex" }}>READY TO FLINCH?</span>
          <span style={{ color: "#E8E8EC", display: "flex" }}>YOU, LET&apos;S MAKE IT MOVE.</span>
        </div>

        <div
          style={{
            color: "#9d9da6",
            fontSize: 22,
            letterSpacing: 4,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex" }}>ONE CHOREOGRAPHY · TWO RENDERERS</span>
          <span style={{ color: "#C6FF3D", display: "flex" }}>900 FRAMES · 30FPS</span>
        </div>
      </div>
    ),
    size
  );
}
