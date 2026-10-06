import type { Metadata } from "next";
import { Placeholder } from "@/components/Placeholder";

export const metadata: Metadata = { title: "Lab" };

export default function Page() {
  return <Placeholder href="/lab" />;
}
