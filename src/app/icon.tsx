import { ImageResponse } from "next/og";

// Browser-tab / home-screen icon: "WK" in white on the site's accent orange.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#c2410c", color: "#fff", fontSize: 17, fontWeight: 700, letterSpacing: -1, borderRadius: 6 }}>
        WK
      </div>
    ),
    size,
  );
}
