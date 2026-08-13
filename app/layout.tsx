// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

/* ── Typeface pairing ─────────────────────────────────────────────
   Display: Barlow Condensed — narrow, athletic, the face of race
            signage and bib numbers. Carries all headings and figures.
   Body:    IBM Plex Sans — engineered humanist sans. Slightly
            technical, which suits an industrial workplace.
   Mono:    IBM Plex Mono — timings and splits, like a timing printout.
   ─────────────────────────────────────────────────────────────── */

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // `title` is what a browser tab shows. iOS uses appleWebApp.title for
  // the home-screen label — without it you get the manifest name or,
  // worse, a guess from the page title.
  title: "Move-Athon S2",
  description: "AAP Move-Athon Mania, Season 2",
  manifest: "/manifest.webmanifest",

  // iOS ignores manifest icons for the home screen and looks for an
  // apple-touch-icon. Missing one is why the generic browser icon
  // appeared instead of the logo.
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  appleWebApp: {
    capable: true,
    title: "Move-Athon S2",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#150e22",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="bg-ink-950 text-chalk antialiased">
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
