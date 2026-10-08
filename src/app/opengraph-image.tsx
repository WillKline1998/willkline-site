import { ImageResponse } from "next/og";

// The link-preview card shown when willkline.net is pasted into iMessage,
// LinkedIn, Slack, etc. Drawn at build time in the Quiet Studio palette.
export const alt = "Will Kline: bassist, composer, and software engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ width: 28, height: "100%", background: "#c2410c" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 96px", flex: 1 }}>
          <div style={{ fontSize: 112, fontWeight: 700, color: "#111", letterSpacing: -4, lineHeight: 1 }}>Will Kline</div>
          <div style={{ display: "flex", gap: 28, marginTop: 36, fontSize: 40, color: "#c2410c", textTransform: "uppercase", letterSpacing: 6 }}>
            <span>Bassist</span><span style={{ color: "#ccc" }}>/</span><span>Composer</span><span style={{ color: "#ccc" }}>/</span><span>Engineer</span>
          </div>
          <div style={{ marginTop: 56, fontSize: 30, color: "#8a8a8a" }}>Music · CV · Writing · Lab · Inspiration Wall</div>
          <div style={{ marginTop: 18, fontSize: 30, color: "#111" }}>willkline.net</div>
        </div>
      </div>
    ),
    size,
  );
}
