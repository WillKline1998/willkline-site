import type { MetadataRoute } from "next";

// Keep search engines out of private and form-only pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/login", "/signup", "/wall/edit", "/forgot", "/reset"] },
    sitemap: "https://willkline.net/sitemap.xml",
  };
}
