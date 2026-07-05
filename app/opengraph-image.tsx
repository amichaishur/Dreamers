import { ImageResponse } from "next/og";

export const alt = "Dreamers · The Weave of Life";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card shown when the link is shared (WhatsApp, etc.).
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 32%, #1A2547 0%, #0A0F24 55%, #02030A 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 150, fontWeight: 800, color: "#E9ECFF", letterSpacing: "-5px", display: "flex" }}>
          Dreamers
        </div>
        {/* swash underline + glowing dot */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 8 }}>
          <div style={{ width: 520, height: 11, borderRadius: 999, background: "linear-gradient(90deg,#5BC8FF,#9A6CFF,#FF6FB5)", boxShadow: "0 0 34px rgba(140,160,255,0.75)" }} />
          <div style={{ width: 26, height: 26, borderRadius: 999, background: "#C9A9FF", marginLeft: -6, boxShadow: "0 0 26px rgba(201,169,255,0.95)" }} />
        </div>
        <div style={{ fontSize: 40, color: "rgba(233,236,255,0.62)", marginTop: 40, letterSpacing: "8px", display: "flex" }}>
          THE WEAVE OF LIFE
        </div>
      </div>
    ),
    { ...size }
  );
}
