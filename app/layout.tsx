import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { theme, OUTER_BG } from "@/lib/theme";
import { LangProvider } from "@/lib/i18n";
import { EntrySheetProvider } from "@/components/EntrySheet";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dreamers-maarag.netlify.app"),
  title: "Dreamers · מארג החיים",
  description: "מערכת ההפעלה האנושית",
  openGraph: {
    title: "Dreamers · מארג החיים",
    description: "מערכת ההפעלה האנושית",
    url: "https://dreamers-maarag.netlify.app",
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
      <body style={{ background: OUTER_BG }}>
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
              <EntrySheetProvider>{children}</EntrySheetProvider>
            </div>
          </div>
        </LangProvider>
      </body>
    </html>
  );
}
