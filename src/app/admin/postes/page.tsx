import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Building2, Edit2, MapPin, Train } from "lucide-react";

export default async function AdminPostesPage() {
  await requireAdminSession();
  const postes = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    include: { secteur: { select: { nom: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Référentiels de postes</h1>
          <p className="text-gray-500 text-sm mt-1">{postes.length} poste(s) enregistré(s)</p>
        </div>
        <Link
          href="/admin/postes/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouveau poste
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {postes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucun poste enregistré</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {postes.map((poste) => {
              let lignes: string[] = [];
              try { lignes = JSON.parse(poste.lignes); } catch { /* noop */ }
              return (
                <li key={poste.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <Building2 size={18} className="text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{poste.nom}</p>
                    <p className="text-sm text-gray-500 truncate">{poste.typePoste}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1">
                      {lignes.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Train size={11} />
                          Ligne{lignes.length > 1 ? "s" : ""} {lignes.join(", ")}
                        </span>
                      )}
                      {poste.secteur && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />
                          {poste.secteur.nom}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/postes/${poste.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 size={15} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
