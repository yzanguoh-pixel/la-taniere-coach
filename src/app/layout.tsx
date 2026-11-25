import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Inter auto-hébergée (licence SIL OFL), pour un build sans dépendance réseau.
const inter = localFont({ src: "./fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: { default: "La Tanière Coach", template: "%s · La Tanière" },
  description: "Coacher plus, gérer moins. Où les loups se rassemblent.",
  icons: { icon: "/logo/taniere-mark-dark.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
