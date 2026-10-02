"use client";

import { calculerBilan, type PlanTheorique, type Situation } from "@/lib/tournee/planning";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import { formatDuree, formatEcart, formatHHmm } from "@/lib/tournee/time";

const MIN = 60_000;

function Ecart({ min, className = "" }: { min: number | null; className?: string }) {
  if (min === null) return <span className={`text-slate-300 ${className}`}>—</span>;
  const r = Math.round(min);
  const color = r > 0 ? "text-red-600" : r < 0 ? "text-emerald-700" : "text-slate-500";
  return <span className={`font-bold tabular-nums ${color} ${className}`}>{r === 0 ? "0" : formatEcart(r).replace(" min", "")}</span>;
}

/** Comparaison théorique / réel + restitution du temps. */
export default function PlanningView({ etapes, plan, situation }: { etapes: TourneePlanEtape[]; plan: PlanTheorique; situation: Situation }) {
  const prog = situation.progression;
  const bilan = calculerBilan(etapes, plan, prog);
  const byKey = new Map(etapes.map((e) => [e.key, e]));

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Prévu</p>
            <p className="text-sm font-bold tabular-nums text-slate-800">{formatHHmm(bilan.debutPrevu)} → {formatHHmm(bilan.finPrevue)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">{prog.termine ? "Réalisé" : "Estimé"}</p>
            <p className="text-sm font-bold tabular-nums text-slate-800">
              {bilan.debutReel ? formatHHmm(bilan.debutReel) : "—"} → {formatHHmm(prog.termine && bilan.finReelle ? bilan.finReelle : situation.finProjetee)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">{prog.termine ? "Écart final" : "Écart actuel"}</p>
            <p className="text-sm"><Ecart min={prog.termine ? bilan.ecartFinalMin : prog.demarre ? situation.ecartMin : null} /> <span className="text-xs text-slate-400">min</span></p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Théorique / réel</h2>
        <div className="card">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">
            <span>Étape</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right w-10">Écart</span>
          </div>
          {bilan.lignes.map((l) => {
            const e = byKey.get(l.key)!;
            const proj = situation.projections.get(l.key);
            const estime = !l.debutReel && proj?.debutProjete && l.debutPrevu !== null && Math.abs(proj.debutProjete - l.debutPrevu) >= MIN;
            if (e.optionnelle && l.statut !== "terminee" && l.statut !== "en_cours") {
              return (
                <div key={l.key} className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2 text-xs text-slate-400 border-b border-slate-50 last:border-0">
                  <span className="truncate">{e.titre}</span>
                  <span>{l.statut === "ignoree" ? "⏭️ ignorée" : "optionnelle"}</span>
                </div>
              );
            }
            return (
              <div key={l.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 text-sm items-center border-b border-slate-50 last:border-0">
                <span className={`truncate ${l.statut === "non_realisee" ? "line-through text-slate-400" : "text-slate-800"}`}>{e.titre}</span>
                <span className="text-right tabular-nums text-slate-500">{l.debutPrevu !== null ? formatHHmm(l.debutPrevu) : "opt."}</span>
                <span className="text-right tabular-nums font-semibold text-slate-800">
                  {l.debutReel ? formatHHmm(l.debutReel) : estime ? <span className="font-normal italic text-orange-600">~{formatHHmm(proj!.debutProjete!)}</span> : "—"}
                </span>
                <Ecart min={l.ecartDebutMin} className="text-right w-10 text-xs" />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Durées sur place</h2>
        <div className="card">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100">
            <span>Étape</span><span className="text-right">Prévu</span><span className="text-right">Réel</span><span className="text-right w-10">Écart</span>
          </div>
          {bilan.lignes
            .filter((l) => l.dureePrevueMin > 0 && (l.dureeReelleMin !== null || !byKey.get(l.key)!.optionnelle))
            .map((l) => (
              <div key={l.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 text-sm items-center border-b border-slate-50 last:border-0">
                <span className="truncate text-slate-800">{byKey.get(l.key)!.titre}</span>
                <span className="text-right tabular-nums text-slate-500">{formatDuree(l.dureePrevueMin)}</span>
                <span className="text-right tabular-nums font-semibold">{l.dureeReelleMin !== null ? formatDuree(l.dureeReelleMin) : "—"}</span>
                <Ecart min={l.ecartDureeMin} className="text-right w-10 text-xs" />
              </div>
            ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Durées calculées à partir des débuts et fins enregistrés — elles permettent de vérifier a posteriori si les temps du parcours sont réalistes.
        </p>
      </section>
    </div>
  );
}
