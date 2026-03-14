import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit2, Plus } from "lucide-react";

export default async function AdminSecteursPage() {
  await requireAdminSession();
  const secteurs = await prisma.secteur.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { fiches: true, postes: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secteurs</h1>
          <p className="text-gray-500 text-sm mt-1">{secteurs.length} secteur(s) enregistré(s)</p>
        </div>
        <Link
          href="/admin/secteurs/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouveau secteur
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-24">Ligne</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600">Trajet</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-28">Relations</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {secteurs.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{s.nom}</td>
                <td className="px-4 py-4">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-mono">{s.ligne}</span>
                </td>
                <td className="px-4 py-4 text-gray-600 text-xs">{s.trajet}</td>
                <td className="px-4 py-4 text-gray-500 text-xs">
                  {s._count.fiches}f / {s._count.postes}p
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/secteurs/${s.id}`}
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
