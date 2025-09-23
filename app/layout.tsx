// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // ✅ relative path (not alias)

import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Move-a-thon Mania",
  description: "AAP Fitness Event",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
