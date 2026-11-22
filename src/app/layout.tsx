import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/Theme";
import { getDefaultTheme } from "@/lib/theme-setting";
import { themeBootScript } from "@/lib/themes";
import { DemoCursor } from "@/components/DemoCursor";
import { Nav } from "@/components/Nav";
import { openGraph } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Bassist, composer, and software engineer. Music, CV, media, writing, and experiments.";

// metadataBase makes every relative image/URL in link previews absolute.
export const metadata: Metadata = {
  metadataBase: new URL("https://willkline.net"),
  title: { default: "Will Kline", template: "%s · Will Kline" },
  description: DESCRIPTION,
  openGraph: openGraph({ description: DESCRIPTION }),
  twitter: { card: "summary_large_image" },
};

// Artist-page layout: sidebar nav + one content column (top bar on mobile).
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The admin default is rendered into the HTML; the boot script swaps in the visitor's own choice pre-paint
  // (hence suppressHydrationWarning: <html data-theme> may legitimately differ from the server render).
  const defaultTheme = await getDefaultTheme();
  return (
    <html
      lang="en"
      data-theme={defaultTheme}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
      </head>
      <body>
        <ThemeProvider defaultTheme={defaultTheme}>
          <DemoCursor />
          <div className="site-shell">
            <Nav />
            <div className="site-main">
              <main>{children}</main>
              <footer className="site-footer">
                © {new Date().getFullYear()} Will Kline ·{" "}
                <span className="last-updated">last updated October 2026</span>
              </footer>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
