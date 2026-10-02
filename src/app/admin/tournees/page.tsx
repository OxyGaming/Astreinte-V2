import Link from "next/link";
import { Plus, Edit2, Route } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import TourneesAdminTabs from "./TourneesAdminTabs";

export const dynamic = "force-dynamic";

const STATUT_STYLE: Record<string, string> = {
  BROUILLON: "bg-amber-100 text-amber-700",
  PUBLIE: "bg-green-100 text-green-700",
  ARCHIVE: "bg-gray-100 text-gray-500",
};
const STATUT_LABEL: Record<string, string> = { BROUILLON: "Brouillon", PUBLIE: "Publié", ARCHIVE: "Archivé" };

export default async function AdminTourneesPage() {
  await requireAdminSession();
  const modeles = await prisma.tourneeModele.findMany({
    orderBy: [{ statut: "asc" }, { updatedAt: "desc" }],
    include: { _count: { select: { etapes: true, realisations: true } } },
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tournées terrain</h1>
          <p className="text-gray-500 text-sm mt-1">Parcours préparés, réutilisables pour des tournées solo ou en équipe</p>
        </div>
        <Link
          href="/admin/tournees/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={16} />
          Nouveau modèle
        </Link>
      </div>

      <TourneesAdminTabs active="modeles" />

      {modeles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <Route size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun modèle de tournée.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-50">
          {modeles.map((m) => (
            <Link
              key={m.id}
              href={`/admin/tournees/${m.id}`}
              className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-gray-900">{m.titre}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[m.statut] ?? ""}`}>
                    {STATUT_LABEL[m.statut] ?? m.statut}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {m.sousTitre ? `${m.sousTitre} · ` : ""}
                  Départ {m.heureDepart} · {m._count.etapes} étape(s) · {m._count.realisations} réalisation(s) · v{m.version}
                </p>
              </div>
              <Edit2 size={15} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
