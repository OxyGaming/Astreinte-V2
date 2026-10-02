"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Route, CloudOff, FileDown, Flag, XCircle, Rocket, UserPlus, Loader2, Users, User } from "lucide-react";
import type { RealisationView } from "@/lib/tournee/realisation";
import { calculerSituation, construirePlanTheorique } from "@/lib/tournee/planning";
import { formatDateCourte, formatHHmm } from "@/lib/tournee/time";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import TourneeInfos from "@/components/tournee/TourneeInfos";
import { NIVEAU_STYLE, libelleEcart } from "@/components/tournee/etape-ui";
import { useRealisation } from "./useRealisation";
import ParcoursView from "./ParcoursView";
import PlanningView from "./PlanningView";
import EquipeView from "./EquipeView";
import PreparationPanel from "./PreparationPanel";
import PartagePanel from "./PartagePanel";
import ContributionForm from "./ContributionForm";

type Tab = "parcours" | "planning" | "equipe" | "infos";

export default function RealisationClient({ initial }: { initial: RealisationView }) {
  const { view, setView, now, emit, refresh, myEvents, me, pendingCount, syncError, lastSync } = useRealisation(initial);
  const equipe = view.mode === "EQUIPE";
  const [tab, setTab] = useState<Tab>(equipe && !view.me.participantId ? "equipe" : "parcours");
  const [busy, setBusy] = useState<string | null>(null);
  const [contribEtape, setContribEtape] = useState<TourneePlanEtape | null | undefined>(undefined);

  const etapes = view.plan.etapes;
  const seuils = view.plan.seuils;
  const plan = useMemo(() => construirePlanTheorique(etapes, view.date, view.heureDepart), [etapes, view.date, view.heureDepart]);
  const situation = useMemo(
    () => (me ? calculerSituation(etapes, plan, myEvents, now, seuils) : null),
    [me, etapes, plan, myEvents, now, seuils],
  );

  const cloturee = view.statut === "TERMINEE" || view.statut === "ANNULEE";
  const attenteLancement = equipe && view.statut === "PREPARATION";
  const canAct = !!me && !cloturee && !attenteLancement;

  async function gerer(action: "lancer" | "terminer" | "annuler") {
    const msg = {
      lancer: "Lancer la tournée ? Le parcours ne pourra plus être ajusté ; chaque participant pourra démarrer.",
      terminer: "Clôturer la tournée pour toute l'équipe ?",
      annuler: "Annuler cette tournée ?",
    }[action];
    if (!confirm(msg)) return;
    setBusy(action);
    const res = await fetch(`/api/tournees/realisations/${view.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(null);
    if (res.ok) setView(data);
    else alert(data.error ?? "Action impossible");
  }

  async function rejoindre() {
    setBusy("join");
    const res = await fetch(`/api/tournees/realisations/${view.id}/participants`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) {
      setView(data);
      setTab("parcours");
    } else alert(data.error ?? "Impossible de rejoindre");
  }

  const ns = situation ? NIVEAU_STYLE[situation.niveau] : null;
  const tabs: { key: Tab; label: string }[] = [
    { key: "parcours", label: "Parcours" },
    { key: "planning", label: "Planning" },
    ...(equipe ? [{ key: "equipe" as const, label: `Équipe (${view.participants.length})` }] : []),
    { key: "infos", label: "Infos" },
  ];

  const blocage = !me
    ? "Vous suivez cette tournée sans y participer."
    : attenteLancement
      ? view.me.isReferent
        ? "Ajustez si besoin le parcours, partagez le code, puis lancez la tournée."
        : "En attente du lancement par le référent. Vous pourrez alors démarrer à votre rythme."
      : cloturee
        ? view.statut === "ANNULEE" ? "Tournée annulée." : "Tournée clôturée."
        : undefined;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* En-tête collant : on sait toujours où l'on en est. */}
      <div className="sticky top-0 z-30 bg-blue-900 text-white shadow-md">
        <div className="px-4 pt-3 pb-3 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <Link href="/tournees" className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100"><ArrowLeft size={14} /> Tournées</Link>
            <span className="text-[11px] opacity-70 flex items-center gap-1">
              {equipe ? <Users size={11} /> : <User size={11} />} {equipe ? "Équipe" : "Solo"} · {formatDateCourte(view.date)}
            </span>
          </div>
          <h1 className="font-bold text-lg leading-tight mt-1 flex items-center gap-2"><Route size={16} className="opacity-70 flex-shrink-0" /> <span className="truncate">{view.titre}</span></h1>
          {situation && ns && !cloturee && !attenteLancement && (
            <div className={`mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2 border ${ns.badge}`}>
              <span className="font-black text-sm">{ns.emoji} {libelleEcart(situation.niveau, situation.ecartMin).toUpperCase()}</span>
              {situation.progression.demarre && !situation.progression.termine && (
                <span className="text-xs font-semibold">fin estimée {formatHHmm(situation.finProjetee)}</span>
              )}
            </div>
          )}
        </div>
        <nav className="flex px-2 lg:px-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap ${tab === t.key ? "border-amber-400 text-white" : "border-transparent text-white/60"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {(syncError || pendingCount > 0) && (
        <div className="mx-4 mt-3 lg:mx-8 flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
          <CloudOff size={14} /> {syncError ?? `${pendingCount} action(s) en cours d'envoi…`}
          <button onClick={() => void refresh()} className="ml-auto underline">Réessayer</button>
        </div>
      )}

      <div className="px-4 py-4 space-y-4 lg:px-8">
        {/* Rejoindre (spectateur d'une tournée d'équipe ouverte) */}
        {view.me.canJoin && (
          <button onClick={rejoindre} disabled={busy === "join"}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base disabled:opacity-60">
            {busy === "join" ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} Rejoindre cette tournée
          </button>
        )}

        {/* Outils du référent */}
        {view.me.isReferent && equipe && !cloturee && (
          <div className="space-y-3">
            {view.statut === "PREPARATION" && <PreparationPanel view={view} onSaved={setView} />}
            {view.codePartage && <PartagePanel code={view.codePartage} />}
            {view.statut === "PREPARATION" && (
              <button onClick={() => gerer("lancer")} disabled={!!busy}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60">
                <Rocket size={18} /> Lancer la tournée
              </button>
            )}
          </div>
        )}

        {tab === "parcours" && (
          situation ? (
            <ParcoursView etapes={etapes} plan={plan} situation={situation} now={now} canAct={canAct} blocage={blocage}
              emit={emit} onContribuer={me ? (e) => setContribEtape(e) : undefined} />
          ) : (
            <div className="card p-5 text-center text-sm text-slate-600">{blocage}</div>
          )
        )}
        {tab === "planning" && situation && <PlanningView etapes={etapes} plan={plan} situation={situation} />}
        {tab === "planning" && !situation && <div className="card p-5 text-center text-sm text-slate-500">Le planning individuel est disponible pour les participants. Consultez l&apos;onglet Équipe.</div>}
        {tab === "equipe" && equipe && (
          <EquipeView etapes={etapes} plan={plan} participants={view.participants} myId={view.me.participantId}
            mySituation={situation} now={now} seuils={seuils} />
        )}
        {tab === "infos" && (
          <div className="space-y-4">
            <TourneeInfos plan={view.plan} />
            <a href={`/api/tournees/realisations/${view.id}/pdf`} target="_blank" rel="noopener"
              className="card p-3 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
              <FileDown size={16} /> Document PDF de la tournée
            </a>
            {me && <button onClick={() => setContribEtape(null)} className="card p-3 w-full text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Contribuer (hors étape)</button>}
          </div>
        )}

        {/* Clôture par le référent (équipe) ou abandon (solo) */}
        {view.me.isReferent && !cloturee && view.statut !== "PREPARATION" && (
          <div className="flex gap-2 pt-4">
            {equipe && (
              <button onClick={() => gerer("terminer")} disabled={!!busy} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center justify-center gap-1.5">
                <Flag size={14} /> Clôturer pour l&apos;équipe
              </button>
            )}
            <button onClick={() => gerer("annuler")} disabled={!!busy} className="flex-1 py-2.5 rounded-xl bg-slate-50 text-slate-400 text-sm font-semibold flex items-center justify-center gap-1.5">
              <XCircle size={14} /> Annuler la tournée
            </button>
          </div>
        )}
        {view.me.isReferent && equipe && view.statut === "PREPARATION" && (
          <button onClick={() => gerer("annuler")} disabled={!!busy} className="w-full py-2 text-xs text-slate-400">Annuler cette tournée</button>
        )}

        <p className="text-[11px] text-slate-300 text-center pt-2">Synchronisé à {formatHHmm(lastSync)} · référent {view.createdByNom}</p>
      </div>

      {contribEtape !== undefined && (
        <ContributionForm realisationId={view.id} etape={contribEtape} onClose={() => setContribEtape(undefined)} />
      )}
    </div>
  );
}
