import Link from "next/link";
import { ChevronRight, Users, User, History } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatDateCourte } from "@/lib/tournee/time";
import TourneesAdminTabs from "../TourneesAdminTabs";

export const dynamic = "force-dynamic";

const STATUT: Record<string, { label: string; cls: string }> = {
  PREPARATION: { label: "Préparation", cls: "bg-violet-100 text-violet-700" },
  EN_COURS: { label: "En cours", cls: "bg-blue-100 text-blue-700" },
  TERMINEE: { label: "Terminée", cls: "bg-green-100 text-green-700" },
  ANNULEE: { label: "Annulée", cls: "bg-gray-100 text-gray-500" },
};

/** Historique de toutes les réalisations (consultation). */
export default async function AdminRealisationsPage() {
  await requireAdminSession();
  const rows = await prisma.tourneeRealisation.findMany({
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      createdBy: { select: { prenom: true, nom: true } },
      _count: { select: { participants: true, contributions: true } },
    },
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tournées terrain</h1>
        <p className="text-gray-500 text-sm mt-1">Historique des tournées réalisées (solo et équipe)</p>
      </div>
      <TourneesAdminTabs active="realisations" />
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <History size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune réalisation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-50">
          {rows.map((r) => (
            <Link key={r.id} href={`/tournees/r/${r.id}`} className="flex items-center gap-4 px-4 sm:px-6 py-3.5 hover:bg-gray-50">
              {r.mode === "EQUIPE" ? <Users size={16} className="text-violet-500 flex-shrink-0" /> : <User size={16} className="text-gray-400 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.titre}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUT[r.statut]?.cls ?? ""}`}>{STATUT[r.statut]?.label ?? r.statut}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateCourte(r.date)} · départ {r.heureDepart} · {r.createdBy.prenom} {r.createdBy.nom} · {r._count.participants} participant(s)
                  {r._count.contributions > 0 && ` · ${r._count.contributions} contribution(s)`} · modèle v{r.modeleVersion}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
