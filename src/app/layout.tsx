import type { Metadata } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoModeProvider } from "@/components/DemoMode";
import { Nav } from "@/components/Nav";
import { ThemePreview } from "@/components/ThemePreview";
import { DEFAULT_THEME } from "@/lib/themes";

const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"] });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Will Kline", template: "%s · Will Kline" },
  description: "Bassist, composer, and software engineer. Music, CV, media, writing, and experiments.",
};

// Artist-page layout: sidebar nav + one content column (top bar on mobile).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-mode="normal"
      data-theme={DEFAULT_THEME}
      className={`${garamond.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <ThemePreview />
        <DemoModeProvider>
          <div className="site-shell">
            <Nav />
            <div className="site-main">
              <main>{children}</main>
              <footer className="site-footer">
                © {new Date().getFullYear()} Will Kline · <span className="last-updated">last updated October 2026</span>
              </footer>
            </div>
          </div>
        </DemoModeProvider>
      </body>
    </html>
  );
}
