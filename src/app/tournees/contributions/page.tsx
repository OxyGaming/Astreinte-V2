export const dynamic = "force-dynamic";

import { MessageSquarePlus, Camera } from "lucide-react";
import { requireUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import TourneeHeader from "@/components/tournee/TourneeHeader";
import {
  CONTRIBUTION_STATUT_LABELS,
  CONTRIBUTION_STATUT_STYLE,
  CONTRIBUTION_TYPE_LABELS,
  type ContributionStatut,
  type ContributionType,
} from "@/lib/tournee/contributions";

/** Suivi de mes contributions terrain (statut du traitement). */
export default async function MesContributionsPage() {
  const user = await requireUserSession();
  const rows = await prisma.tourneeContribution.findMany({
    where: { auteurId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      realisation: { select: { titre: true } },
      _count: { select: { photos: true } },
      historique: { where: { type: "COMMENTAIRE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <TourneeHeader back="/tournees" backLabel="Tournées" titre="Mes contributions" sousTitre="Remontées terrain et suivi de leur traitement." />
      <div className="px-4 py-5 lg:px-8">
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            <MessageSquarePlus size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune contribution. Utilisez « Contribuer » pendant une tournée.</p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {rows.map((c) => (
              <div key={c.id} className="px-4 py-3.5 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CONTRIBUTION_STATUT_STYLE[c.statut as ContributionStatut]}`}>
                    {CONTRIBUTION_STATUT_LABELS[c.statut as ContributionStatut]}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{CONTRIBUTION_TYPE_LABELS[c.type as ContributionType]}</span>
                  {c._count.photos > 0 && <span className="text-xs text-slate-400 flex items-center gap-0.5"><Camera size={11} /> {c._count.photos}</span>}
                </div>
                <p className="text-sm text-slate-600">{c.description}</p>
                <p className="text-xs text-slate-400">
                  {c.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                  {c.realisation && ` · ${c.realisation.titre}`}
                  {c.etapeTitre && ` › ${c.etapeTitre}`}
                </p>
                {c.historique[0]?.message && (
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">💬 {c.historique[0].message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
