import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Album art currently comes from DistroKid's CDN (see prisma/seed.ts).
    remotePatterns: [{ protocol: "https", hostname: "distrokid.imgix.net" }],
  },
};

export default nextConfig;
