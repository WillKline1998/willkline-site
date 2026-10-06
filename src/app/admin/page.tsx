import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

// Milestone M3: protected by auth; lets Will edit albums, upload a new CV, etc.
export default function AdminPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Admin</h1>
      <p className="mt-3 opacity-80">Login and content editing arrive in milestone M3.</p>
    </section>
  );
}
