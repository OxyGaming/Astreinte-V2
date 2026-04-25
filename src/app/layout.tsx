import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import PendingOpsBadge from "@/components/PendingOpsBadge";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Astreinte — UOC Zone Diffuse",
  description: "Application d'aide à l'astreinte — Secteur Gier / Rive Droite Nord",
  manifest: "/manifest.json",
  icons: {
    // Apple touch icon pour iOS (Add to Home Screen)
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    // black-translucent : la barre d'état adopte la couleur du fond de l'app
    statusBarStyle: "black-translucent",
    title: "Astreinte",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover : active env(safe-area-inset-*) sur les appareils à encoche (iOS/Android)
  viewportFit: "cover",
  // maximumScale intentionnellement absent : l'utilisateur doit pouvoir zoomer (WCAG 1.4.4)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-slate-50">
        <ServiceWorkerRegister />
        <SideNav />
        {/* Wrapper décalé de la sidebar, flex pour que OfflineIndicator pousse le contenu vers le bas */}
        <div className="lg:ml-64 flex flex-col min-h-screen">
          <OfflineIndicator />
          <PendingOpsBadge />
          <main className="flex-1 pb-nav lg:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
