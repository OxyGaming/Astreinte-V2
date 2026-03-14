"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Phone, MapPin, AlignLeft, Building2, MapPinned, ClipboardList } from "lucide-react";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/fiches", label: "Fiches", icon: FileText },
  { href: "/sessions", label: "Événements", icon: ClipboardList },
  { href: "/contacts", label: "Contacts", icon: Phone },
  { href: "/secteurs", label: "Secteurs", icon: MapPin },
  { href: "/postes", label: "Postes", icon: Building2 },
  { href: "/mnemoniques", label: "Mnémo", icon: AlignLeft },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 lg:hidden">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                active
                  ? "text-blue-800"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? "text-blue-800" : ""}
              />
              <span className={active ? "font-semibold" : ""}>{label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-blue-800 rounded-t-full" />
              )}
            </Link>
          );
        })}
        <LogoutButton variant="mobile" />
      </div>
      <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
