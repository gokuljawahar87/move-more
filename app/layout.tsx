// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Splash from "@/components/Splash";

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
  title: "Move-Athon Mania — Season 2",
  description: "Get moving, get winning.",
  manifest: "/manifest.webmanifest",
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
        <Splash />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
