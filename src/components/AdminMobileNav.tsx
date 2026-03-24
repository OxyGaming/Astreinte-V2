"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  FileText,
  Users,
  MapPin,
  BookOpen,
  AlignLeft,
  LayoutDashboard,
  LogOut,
  Shield,
  Building2,
  MapPinned,
  UserCog,
  Upload,
  ClipboardList,
} from "lucide-react";
import { adminLogoutAction } from "@/app/admin/login/actions";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/fiches", label: "Fiches réflexes", icon: FileText },
  { href: "/admin/contacts", label: "Contacts", icon: Users },
  { href: "/admin/secteurs", label: "Secteurs", icon: MapPin },
  { href: "/admin/acces", label: "Points d'accès", icon: MapPinned },
  { href: "/admin/postes", label: "Postes", icon: Building2 },
  { href: "/admin/procedures", label: "Procédures guidées", icon: ClipboardList },
  { href: "/admin/mnemoniques", label: "Mnémoniques", icon: BookOpen },
  { href: "/admin/abreviations", label: "Abréviations", icon: AlignLeft },
  { href: "/admin/users", label: "Utilisateurs", icon: UserCog },
  { href: "/admin/registrations", label: "Inscriptions", icon: ClipboardList },
  { href: "/admin/import", label: "Import de données", icon: Upload },
];

export default function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Barre supérieure mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 h-14 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm">Administration</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Tiroir latéral */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête du tiroir */}
        <div className="p-5 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-tight">Administration</p>
              <p className="text-xs text-gray-400">Astreinte V2</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <item.icon size={16} className="flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5"
          >
            ← Retour au front-office
          </Link>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
