import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Bio" };

export default function Page() {
  return <Placeholder href="/bio" />;
}
