import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "Seconde Main — Une photo, ton annonce prête pour tous les sites",
  description:
    "Prends ton objet en photo : ton annonce est rédigée pour Vinted, Leboncoin et eBay en quelques secondes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={bricolage.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
