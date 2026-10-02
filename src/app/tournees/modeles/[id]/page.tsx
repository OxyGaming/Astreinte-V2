export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { FileDown, Clock, ListOrdered } from "lucide-react";
import { requireUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import TourneeHeader from "@/components/tournee/TourneeHeader";
import TourneeInfos from "@/components/tournee/TourneeInfos";
import { buildPlanFromModele, masquerPlan } from "@/lib/tournee/server";
import { construirePlanTheorique } from "@/lib/tournee/planning";
import { formatDuree, formatHHmm, parisYmd } from "@/lib/tournee/time";
import ModeleTimeline from "./ModeleTimeline";
import DemarrerTournee from "./DemarrerTournee";

export default async function TourneeModelePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserSession();
  const { id } = await params;
  const modele = await prisma.tourneeModele.findUnique({ where: { id }, select: { statut: true } });
  if (!modele || (modele.statut !== "PUBLIE" && user.role !== "ADMIN")) notFound();
  const raw = await buildPlanFromModele(id);
  if (!raw) notFound();
  const plan = masquerPlan(raw, user.role === "ADMIN");

  const today = parisYmd(Date.now());
  const th = construirePlanTheorique(plan.etapes, today, plan.heureDepart);
  const nbObligatoires = th.obligatoires.length;
  const nbOptionnelles = plan.etapes.length - nbObligatoires;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <TourneeHeader
        back="/tournees"
        backLabel="Tournées"
        titre={plan.titre}
        sousTitre={
          <>
            {plan.sousTitre && <p>{plan.sousTitre}</p>}
            <p className="flex items-center gap-3 mt-1 text-xs opacity-90 flex-wrap">
              <span className="flex items-center gap-1"><Clock size={12} /> {formatHHmm(th.depart)} → {formatHHmm(th.fin)} ({formatDuree((th.fin - th.depart) / 60000)})</span>
              <span className="flex items-center gap-1"><ListOrdered size={12} /> {nbObligatoires} étapes{nbOptionnelles ? ` + ${nbOptionnelles} optionnelle(s)` : ""}</span>
            </p>
          </>
        }
      />
      <div className="px-4 py-5 space-y-6 lg:px-8">
        {modele.statut !== "PUBLIE" && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
            Modèle non publié — visible uniquement par les administrateurs.
          </p>
        )}
        <DemarrerTournee modeleId={id} heureDepart={plan.heureDepart} today={today} />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Programme</h2>
            <a href={`/api/tournees/modeles/${id}/pdf`} target="_blank" rel="noopener" className="text-xs font-semibold text-blue-700 flex items-center gap-1">
              <FileDown size={13} /> PDF
            </a>
          </div>
          <ModeleTimeline plan={plan} date={today} />
        </section>

        <TourneeInfos plan={plan} />
      </div>
    </div>
  );
}
