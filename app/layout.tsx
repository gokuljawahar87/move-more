import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Move-Athon Mania",
  description: "Get Moving, Get Winning!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load Material Symbols Outlined */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className="bg-blue-950 text-white">
        {children}
      </body>
    </html>
  );
}
