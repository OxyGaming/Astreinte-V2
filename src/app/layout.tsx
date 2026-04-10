import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";
import OfflineIndicator from "@/components/OfflineIndicator";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Astreinte — UOC Zone Diffuse",
  description: "Application d'aide à l'astreinte — Secteur Gier / Rive Droite Nord",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Astreinte",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
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
          <main className="flex-1 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
