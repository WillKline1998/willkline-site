import { ImageResponse } from "next/og";

// Browser-tab / home-screen icon: "WK" in white on the site's accent orange.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c2410c", color: "#fff", fontSize: 88, fontWeight: 700, letterSpacing: -4, borderRadius: 0 }}>
        WK
      </div>
    ),
    size,
  );
}
