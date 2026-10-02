"use client";

import { Crown, Users, Clock } from "lucide-react";
import { calculerSituation, syntheseEquipe, type PlanTheorique, type Situation } from "@/lib/tournee/planning";
import type { ParticipantView } from "@/lib/tournee/realisation";
import type { TourneePlanEtape, TourneeSeuils } from "@/lib/tournee/types";
import { formatDuree, formatHHmm } from "@/lib/tournee/time";
import { positionEtape } from "@/lib/tournee/actions";
import { FAISABILITE_STYLE, NIVEAU_STYLE, libelleEcart, libelleEcartCourt } from "@/components/tournee/etape-ui";

const MIN = 60_000;

/**
 * Vue équipe : où en est chacun, son avance/retard, et une synthèse du groupe.
 * Chaque situation est calculée INDIVIDUELLEMENT à partir du journal de la personne.
 */
export default function EquipeView({
  etapes, plan, participants, myId, mySituation, now, seuils,
}: {
  etapes: TourneePlanEtape[];
  plan: PlanTheorique;
  participants: ParticipantView[];
  myId: string | null;
  mySituation: Situation | null;
  now: number;
  seuils: TourneeSeuils;
}) {
  const byKey = new Map(etapes.map((e) => [e.key, e]));
  const lignes = participants.map((p) => ({
    p,
    s: p.id === myId && mySituation ? mySituation : calculerSituation(etapes, plan, p.events, now, seuils),
  }));
  const synth = syntheseEquipe(lignes.map((l) => l.s), seuils);

  // Prochaine optionnelle (dans l'ordre du parcours) encore ouverte pour au
  // moins un participant actif, évaluée pour le participant le plus contraint.
  const faisActives = lignes
    .filter((l) => l.s.progression.demarre && !l.s.progression.termine)
    .flatMap((l) => [...l.s.faisabilites.values()]);
  const optKey = etapes.find((e) => faisActives.some((f) => f.key === e.key))?.key;
  const optPire = optKey
    ? faisActives.filter((f) => f.key === optKey).sort((a, b) => a.margeMin - b.margeMin)[0]
    : undefined;

  const ordre = (l: (typeof lignes)[number]) => {
    const k = l.s.progression.enCoursKey ?? l.s.progression.prochaineKey;
    return l.s.progression.termine ? 999 : k ? etapes.findIndex((e) => e.key === k) : -1;
  };
  lignes.sort((a, b) => ordre(b) - ordre(a));

  const NS = NIVEAU_STYLE[synth.niveau];
  return (
    <div className="space-y-5">
      <section className={`card p-4 border ${NS.badge}`}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-70 flex items-center gap-1.5"><Users size={13} /> Planning équipe</p>
        <p className="text-lg font-black mt-1">
          {NS.emoji} {synth.ecartMoyenMin === null ? "Personne n'a encore démarré" : synth.niveau === "dans_les_temps" ? "Groupe dans les temps" : synth.niveau === "avance" ? `Groupe en avance de ${Math.round(-synth.ecartMoyenMin)} min` : `Groupe en retard de ${Math.round(synth.ecartMoyenMin)} min`}
        </p>
        <p className="text-sm mt-1">
          {synth.participants} participant(s) · {synth.dansLesTemps} dans les temps · {synth.enAvance} en avance · {synth.enRetard} en retard
          {synth.participants - synth.demarres > 0 && ` · ${synth.participants - synth.demarres} pas commencé`}
        </p>
        {optPire && (
          <p className="text-sm mt-2">
            Prochaine optionnelle — <strong>{byKey.get(optPire.key)?.titre}</strong> : {FAISABILITE_STYLE[optPire.niveau].emoji}{" "}
            {FAISABILITE_STYLE[optPire.niveau].titre.toLowerCase()} (marge {Math.round(optPire.margeMin)} min pour le plus contraint)
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Équipe — {participants.length} participant(s)</h2>
        <div className="card divide-y divide-slate-100">
          {lignes.map(({ p, s }) => {
            const prog = s.progression;
            const key = prog.enCoursKey ?? prog.prochaineKey;
            const etape = key ? byKey.get(key) : null;
            const pos = positionEtape(etapes, key);
            const st = NIVEAU_STYLE[s.niveau];
            const depuis = prog.enCoursKey ? prog.etats.get(prog.enCoursKey)!.debut : null;
            const nbFaites = etapes.filter((e) => prog.etats.get(e.key)!.statut === "terminee").length;
            return (
              <div key={p.id} className={`px-4 py-3 ${p.id === myId ? "bg-blue-50/50" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.dot}`} />
                  <span className="font-semibold text-sm text-slate-800 flex-1 truncate">
                    {p.nom}{p.id === myId && <span className="text-slate-400 font-normal"> (moi)</span>}
                    {p.role === "REFERENT" && <Crown size={12} className="inline ml-1 -mt-0.5 text-amber-500" />}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.badge}`}>{libelleEcartCourt(s.niveau, s.ecartMin)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 pl-[18px]">
                  {!prog.demarre
                    ? "Pas encore commencé"
                    : prog.termine
                      ? `Terminé à ${formatHHmm(prog.finTournee!)}`
                      : etape
                        ? <>
                            {pos ? `Étape ${pos.x}/${pos.n}` : "Optionnelle"} — {etape.titre}
                            {prog.enCoursKey ? (
                              depuis && <span className="text-blue-700"> · <Clock size={10} className="inline -mt-0.5" /> depuis {formatDuree((now - depuis) / MIN)}</span>
                            ) : <span className="text-slate-400"> · en route</span>}
                          </>
                        : "—"}
                </p>
                {prog.demarre && (
                  <p className="text-[11px] text-slate-400 pl-[18px]">{libelleEcart(s.niveau, s.ecartMin)} · {nbFaites} étape(s) terminée(s)</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">Chacun avance à son rythme : la progression d&apos;un participant n&apos;entraîne jamais celle des autres.</p>
      </section>
    </div>
  );
}
