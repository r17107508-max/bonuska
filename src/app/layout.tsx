import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AppSplash } from "@/components/app-splash";
import { PwaRegister } from "@/components/pwa-register";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ПроПлюшка - QR-программа лояльности",
  description: "Простая QR-программа лояльности для кофеен, кафе, магазинов и салонов.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ПроПлюшка",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/maskable-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={manrope.variable}>
      <body className="antialiased">
        <AppSplash />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
