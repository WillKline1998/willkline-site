import type { Metadata } from "next";

// Nothing under /admin should ever show up in search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
