import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const alt = "HYPERREEL — WE MAKE THE INTERNET FLINCH.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Static OG image: acid-lime on ink, HYPERREEL wordmark + tagline. */
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
              backgroundColor: "#C6FF3D",
              borderRadius: 4,
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
            HYPERREEL
          </div>
          <div
            style={{
              color: "#C6FF3D",
              fontSize: 15,
              letterSpacing: 3,
              border: "2px solid #C6FF3D",
              borderRadius: 999,
              padding: "6px 14px",
              display: "flex",
              transform: "rotate(3deg)",
            }}
          >
            60FPS OR NOTHING
          </div>
        </div>

        <div
          style={{
            color: "#C6FF3D",
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1.02,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ color: "#C6FF3D", display: "flex" }}>WE MAKE THE</span>
          <span style={{ color: "#E8E8EC", display: "flex" }}>INTERNET FLINCH.</span>
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
          <span style={{ display: "flex" }}>A 3D MOTION STUDIO FOR BRANDS WITH A PULSE.</span>
          <span style={{ color: "#FF4D2E", display: "flex" }}>EST. 2026</span>
        </div>
      </div>
    ),
    size
  );
}
