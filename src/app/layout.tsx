import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SideNav from "@/components/SideNav";

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
        <SideNav />
        <main className="lg:ml-64 pb-20 lg:pb-0 min-h-screen">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
