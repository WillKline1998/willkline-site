import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Album art is served locally from public/covers (scripts/fetch_catalog.py). */
  // Prisma's query engine is a native file Next's tracer can't see because the
  // client is generated into src/; ship it with every server function on Vercel.
  outputFileTracingIncludes: { "/**": ["./src/generated/prisma/*.node"] },
  experimental: {
    // Admin uploads go through Server Actions (default limit 1MB). Vercel caps
    // function request bodies at 4.5MB, so match it; bigger files (video) will
    // need direct-to-Blob client uploads (see docs/STATUS.md).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
