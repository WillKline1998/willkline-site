import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoModeProvider } from "@/components/DemoMode";
import { Nav } from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Will Kline", template: "%s · Will Kline" },
  description: "Musician, software engineer, and tinkerer. Music, CV, media, writing, and experiments.",
};

// Artist-page layout: sidebar nav on desktop, top bar on mobile.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="normal"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full md:flex">
        <DemoModeProvider>
          <Nav />
          <div className="flex min-h-screen flex-1 flex-col">
            <main className="flex-1">{children}</main>
            <footer className="w-full max-w-4xl px-6 py-8 text-sm opacity-50 md:px-12">
              © {new Date().getFullYear()} Will Kline
            </footer>
          </div>
        </DemoModeProvider>
      </body>
    </html>
  );
}
