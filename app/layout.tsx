import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { theme, OUTER_BG } from "@/lib/theme";
import { LangProvider } from "@/lib/i18n";
import { EntrySheetProvider } from "@/components/EntrySheet";
import ReactionAlerts from "@/components/ReactionAlerts";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://dreamers-maarag.netlify.app");

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  // Whichever site is actually serving this. Staging used to point its preview
  // image at production, which meant a second host to reach before a card could
  // be drawn.
  metadataBase: new URL(SITE_URL),
  title: "Dreamers · מארג החיים",
  description: "מערכת ההפעלה האנושית",
  openGraph: {
    title: "Dreamers · מארג החיים",
    description: "מערכת ההפעלה האנושית",
    url: SITE_URL,
    siteName: "Dreamers",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Dreamers · מארג החיים", description: "מערכת ההפעלה האנושית" },
};

export const viewport = {
  themeColor: "#02030A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      {/* Extensions like Grammarly stamp attributes onto <body> before React
          hydrates, which React then reports as a mismatch. Nothing we render
          differs between server and client here, so the warning is noise. */}
      <body style={{ background: OUTER_BG }} suppressHydrationWarning>
        <LangProvider>
          <div
            style={{
              display: "flex",
              minHeight: "100svh",
              width: "100%",
              justifyContent: "center",
              background: OUTER_BG,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 430,
                minHeight: "100svh",
                background: theme.bg,
                overflow: "hidden",
              }}
            >
              <EntrySheetProvider>
                {children}
                {/* Mounted once here so a response reaches you from any screen */}
                <ReactionAlerts />
              </EntrySheetProvider>
            </div>
          </div>
        </LangProvider>
      </body>
    </html>
  );
}
