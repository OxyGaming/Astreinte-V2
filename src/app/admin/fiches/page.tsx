import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, AlertTriangle, Shield } from "lucide-react";

const categorieColors: Record<string, string> = {
  accident: "bg-red-100 text-red-700",
  incident: "bg-amber-100 text-amber-700",
  securite: "bg-blue-100 text-blue-700",
  "gestion-agent": "bg-purple-100 text-purple-700",
  evacuation: "bg-orange-100 text-orange-700",
};

export default async function AdminFichesPage() {
  await requireAdminSession();
  const fiches = await prisma.fiche.findMany({
    orderBy: { numero: "asc" },
    include: {
      _count: { select: { contacts: true, secteurs: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiches réflexes</h1>
          <p className="text-gray-500 text-sm mt-1">{fiches.length} fiche(s) enregistrée(s)</p>
        </div>
        <Link
          href="/admin/fiches/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouvelle fiche
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-gray-600 w-12">#</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600">Titre</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-28">Catégorie</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-20">Priorité</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-24">Relations</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fiches.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{String(f.numero).padStart(2, "0")}</td>
                <td className="px-4 py-4">
                  <p className="font-medium text-gray-900">{f.titre}</p>
                  {f.mnemonique && (
                    <p className="text-xs text-gray-400 mt-0.5">{f.mnemonique}</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${categorieColors[f.categorie] || "bg-gray-100 text-gray-600"}`}>
                    {f.categorie}
                  </span>
                </td>
                <td className="px-4 py-4">
                  {f.priorite === "urgente" ? (
                    <span className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertTriangle size={12} />
                      Urgente
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 text-xs">
                      <Shield size={12} />
                      Normale
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs text-gray-500">
                    {f._count.contacts}c / {f._count.secteurs}s
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/fiches/${f.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                    title="Modifier"
                  >
                    <Edit2 size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
