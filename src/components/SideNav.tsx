"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Phone, MapPin, AlignLeft, Shield, Building2, Settings, MapPinned, ClipboardList } from "lucide-react";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/fiches", label: "Fiches réflexes", icon: FileText },
  { href: "/sessions", label: "Événements", icon: ClipboardList },
  { href: "/contacts", label: "Contacts utiles", icon: Phone },
  { href: "/secteurs", label: "Secteurs", icon: MapPin },
  { href: "/acces", label: "Points d'accès", icon: MapPinned },
  { href: "/postes", label: "Référentiels postes", icon: Building2 },
  { href: "/mnemoniques", label: "Mnémotechniques", icon: AlignLeft },
];

export default function SideNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/admin")) return null;

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-blue-900 text-white z-40">
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-800 rounded-xl">
            <Shield size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Astreinte</h1>
            <p className="text-blue-300 text-xs">UOC Zone Diffuse</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                active
                  ? "bg-blue-800 text-white shadow-sm"
                  : "text-blue-200 hover:bg-blue-800/50 hover:text-white"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-blue-800 space-y-2">
        <LogoutButton variant="sidebar" />
        <Link
          href="/admin"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/60 transition-all text-xs font-medium"
          title="Back-office administration"
        >
          <Settings size={14} />
          Administration
        </Link>
        <p className="text-blue-600 text-xs px-1">Secteur Gier / RDN</p>
      </div>
    </aside>
  );
}
