import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FileText, Users, MapPin, BookOpen, AlignLeft, Plus, TrendingUp, Building2, MapPinned, ClipboardList } from "lucide-react";

export default async function AdminDashboard() {
  await requireAdminSession();

  const [fichesCount, contactsCount, secteursCount, postesCount, accesCount, mnemoniquesCount, abreviationsCount, proceduresCount] =
    await Promise.all([
      prisma.fiche.count(),
      prisma.contact.count(),
      prisma.secteur.count(),
      prisma.poste.count(),
      prisma.accesRail.count(),
      prisma.mnemonique.count(),
      prisma.abreviation.count(),
      prisma.procedure.count(),
    ]);

  const recentFiches = await prisma.fiche.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: { id: true, titre: true, categorie: true, updatedAt: true },
  });
  const recentContacts = await prisma.contact.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: { id: true, nom: true, role: true, updatedAt: true },
  });

  const stats = [
    { label: "Fiches réflexes", count: fichesCount, icon: FileText, href: "/admin/fiches", color: "bg-blue-500" },
    { label: "Contacts", count: contactsCount, icon: Users, href: "/admin/contacts", color: "bg-green-500" },
    { label: "Secteurs", count: secteursCount, icon: MapPin, href: "/admin/secteurs", color: "bg-amber-500" },
    { label: "Points d'accès", count: accesCount, icon: MapPinned, href: "/admin/acces", color: "bg-orange-500" },
    { label: "Postes", count: postesCount, icon: Building2, href: "/admin/postes", color: "bg-cyan-500" },
    { label: "Mnémoniques", count: mnemoniquesCount, icon: BookOpen, href: "/admin/mnemoniques", color: "bg-purple-500" },
    { label: "Abréviations", count: abreviationsCount, icon: AlignLeft, href: "/admin/abreviations", color: "bg-gray-500" },
    { label: "Procédures guidées", count: proceduresCount, icon: ClipboardList, href: "/admin/procedures", color: "bg-indigo-500" },
  ];

  const quickActions = [
    { label: "Nouvelle fiche", href: "/admin/fiches/new", icon: FileText },
    { label: "Nouveau contact", href: "/admin/contacts/new", icon: Users },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez les contenus de l&apos;application Astreinte</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center`}>
                <s.icon size={18} className="text-white" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{s.count}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 group-hover:text-blue-600 transition-colors">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-800">Actions rapides</h2>
        </div>
        <div className="flex gap-3 flex-wrap">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus size={15} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Modifications récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Fiches récemment modifiées
          </h2>
          <ul className="space-y-2">
            {recentFiches.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/admin/fiches/${f.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700 truncate flex-1">{f.titre}</span>
                  <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                    {new Date(f.updatedAt).toLocaleDateString("fr-FR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-green-500" />
            Contacts récemment modifiés
          </h2>
          <ul className="space-y-2">
            {recentContacts.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/contacts/${c.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{c.nom}</p>
                    <p className="text-xs text-gray-400 truncate">{c.role}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-3 flex-shrink-0">
                    {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
