import Link from "next/link";
import { Camera, ChevronRight, Inbox } from "lucide-react";
import { requireContributionManagerSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  CONTRIBUTION_STATUTS,
  CONTRIBUTION_STATUT_LABELS,
  CONTRIBUTION_STATUT_STYLE,
  CONTRIBUTION_TYPE_LABELS,
  isContributionStatut,
  type ContributionStatut,
  type ContributionType,
} from "@/lib/tournee/contributions";
import TourneesAdminTabs from "../TourneesAdminTabs";

export const dynamic = "force-dynamic";

const OUVERTS: ContributionStatut[] = ["NOUVELLE", "EN_ANALYSE", "A_TRAITER", "EN_COURS"];

export default async function AdminContributionsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const user = await requireContributionManagerSession();
  const { statut } = await searchParams;
  const filtre = statut === "tous" ? undefined : isContributionStatut(statut) ? [statut] : OUVERTS;

  const [rows, counts] = await Promise.all([
    prisma.tourneeContribution.findMany({
      where: filtre ? { statut: { in: filtre } } : {},
      orderBy: { createdAt: "desc" },
      include: {
        auteur: { select: { prenom: true, nom: true } },
        assignee: { select: { prenom: true, nom: true } },
        realisation: { select: { titre: true, date: true } },
        modele: { select: { titre: true } },
        _count: { select: { photos: true } },
      },
      take: 200,
    }),
    prisma.tourneeContribution.groupBy({ by: ["statut"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.statut === s)?._count ?? 0;
  const tabs = [
    { key: "", label: "À traiter", n: OUVERTS.reduce((a, s) => a + countOf(s), 0) },
    ...CONTRIBUTION_STATUTS.map((s) => ({ key: s, label: CONTRIBUTION_STATUT_LABELS[s], n: countOf(s) })),
    { key: "tous", label: "Toutes", n: counts.reduce((a, c) => a + c._count, 0) },
  ];
  const actif = statut && (statut === "tous" || isContributionStatut(statut)) ? statut : "";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tournées terrain</h1>
        <p className="text-gray-500 text-sm mt-1">Contributions remontées du terrain — elles ne modifient jamais les parcours</p>
      </div>
      <TourneesAdminTabs active="contributions" showModeles={user.role === "ADMIN"} />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/tournees/contributions${t.key ? `?statut=${t.key}` : ""}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${actif === t.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
            <span className={`px-1.5 rounded-full ${actif === t.key ? "bg-white/20" : "bg-gray-100"}`}>{t.n}</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <Inbox size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune contribution.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-50">
          {rows.map((c) => (
            <Link key={c.id} href={`/admin/tournees/contributions/${c.id}`} className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CONTRIBUTION_STATUT_STYLE[c.statut as ContributionStatut] ?? ""}`}>
                    {CONTRIBUTION_STATUT_LABELS[c.statut as ContributionStatut] ?? c.statut}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{CONTRIBUTION_TYPE_LABELS[c.type as ContributionType] ?? c.type}</span>
                  {c._count.photos > 0 && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Camera size={11} /> {c._count.photos}</span>}
                </div>
                <p className="text-sm text-gray-600 truncate">{c.description || "(photo seule)"}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.auteur.prenom} {c.auteur.nom} · {c.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                  {(c.modele?.titre ?? c.realisation?.titre) && ` · ${c.modele?.titre ?? c.realisation?.titre}`}
                  {c.etapeTitre && ` › ${c.etapeTitre}`}
                  {c.assignee && ` · affectée à ${c.assignee.prenom} ${c.assignee.nom}`}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
