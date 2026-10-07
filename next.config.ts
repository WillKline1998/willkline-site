import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Album art is served locally from public/covers (scripts/fetch_catalog.py). */
  experimental: {
    // Admin uploads (PDFs, images) go through Server Actions; default limit is 1MB.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
