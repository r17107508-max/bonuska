import type { Metadata } from "next";
import { AppSplash } from "@/components/app-splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "ПроПлюшка - QR-программы лояльности",
  description: "PWA/SaaS для цифровых бонусных карт малых бизнесов.",
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
  const clearServiceWorkerScript = `
(() => {
  if (!("serviceWorker" in navigator)) return;
  const reloadKey = "proplushka-sw-cleanup-reloaded";
  Promise.resolve()
    .then(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      if (navigator.serviceWorker.controller && sessionStorage.getItem(reloadKey) !== "1") {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      }
    })
    .catch(() => {});
})();
`;

  return (
    <html lang="ru">
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: clearServiceWorkerScript }} />
        <AppSplash />
        {children}
      </body>
    </html>
  );
}
