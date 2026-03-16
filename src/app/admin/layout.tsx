import { ReactNode } from "react";
import Link from "next/link";
import {
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
} from "lucide-react";
import { adminLogoutAction } from "./login/actions";
import AdminMobileNav from "@/components/AdminMobileNav";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/fiches", label: "Fiches réflexes", icon: FileText },
  { href: "/admin/contacts", label: "Contacts", icon: Users },
  { href: "/admin/secteurs", label: "Secteurs", icon: MapPin },
  { href: "/admin/acces", label: "Points d'accès", icon: MapPinned },
  { href: "/admin/postes", label: "Postes", icon: Building2 },
  { href: "/admin/mnemoniques", label: "Mnémoniques", icon: BookOpen },
  { href: "/admin/abreviations", label: "Abréviations", icon: AlignLeft },
  { href: "/admin/users", label: "Utilisateurs", icon: UserCog },
  { href: "/admin/import", label: "Import de données", icon: Upload },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* --- Sidebar desktop (lg+) --- */}
      <aside className="hidden lg:flex w-64 bg-gray-900 text-white flex-col fixed inset-y-0 left-0 z-40 shadow-xl">
        {/* Logo */}
        <div className="p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-tight">Administration</p>
              <p className="text-xs text-gray-400">Astreinte V2</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors group"
            >
              <item.icon
                size={16}
                className="text-gray-400 group-hover:text-blue-400 transition-colors flex-shrink-0"
              />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <Link
            href="/"
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

      {/* --- Navigation mobile (< lg) --- */}
      <AdminMobileNav />

      {/* --- Contenu principal --- */}
      {/* pt-14 sur mobile pour compenser la barre de navigation fixe */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
