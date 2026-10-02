"use client";

import { useState } from "react";
import {
  CheckCircle2, Circle, Timer, Car, SkipForward, RotateCcw, Play, Flag, BookOpen, Library, Camera, Navigation, MessageSquarePlus,
  EyeOff, Clock,
} from "lucide-react";
import type { Situation, PlanTheorique, Faisabilite } from "@/lib/tournee/planning";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import { formatChrono, formatDuree, formatEcart, formatHHmm } from "@/lib/tournee/time";
import { demarrerEtape, demarrerTournee, ignorerEtape, positionEtape, reprendreEtape, terminerEtape, type EventSpec } from "@/lib/tournee/actions";
import { navigationUrl } from "@/lib/tournee/navigation";
import { ETAPE_ICON, FAISABILITE_STYLE } from "@/components/tournee/etape-ui";
import EtapeSheet from "./EtapeSheet";

interface Props {
  etapes: TourneePlanEtape[];
  plan: PlanTheorique;
  situation: Situation;
  now: number;
  /** Le participant peut agir (participant + tournée ouverte à la progression). */
  canAct: boolean;
  /** Message quand on ne peut pas agir (attente lancement, simple spectateur…). */
  blocage?: React.ReactNode;
  emit: (events: EventSpec[]) => void;
  onContribuer?: (etape: TourneePlanEtape) => void;
}

const MIN = 60_000;

function Horaires({ debut, fin, duree }: { debut: number | null; fin: number | null; duree: number }) {
  if (debut === null) return null;
  return (
    <span className="tabular-nums">
      {formatHHmm(debut)}
      {duree > 0 && fin !== null && <> → {formatHHmm(fin)}</>}
    </span>
  );
}

function FaisabiliteCard({ f, compact = false }: { f: Faisabilite; compact?: boolean }) {
  const s = FAISABILITE_STYLE[f.niveau];
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.badge}`}>
        {s.emoji} {f.niveau === "non_faisable" ? "Non réalisable" : f.niveau === "juste" ? `Marge ${Math.round(f.margeMin)} min` : "Réalisable"}
      </span>
    );
  }
  return (
    <div className={`rounded-xl border p-3 text-sm ${s.badge}`}>
      <p className="font-bold">{s.emoji} {s.titre}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-xs tabular-nums">
        <span>Temps disponible</span><span className="font-semibold text-right">{formatDuree(Math.max(0, f.disponibleMin))}</span>
        <span>Temps nécessaire</span><span className="font-semibold text-right">{f.necessaireMin} min <span className="font-normal opacity-70">({f.dureeMin} + {f.trajetMin} trajet)</span></span>
        <span>Marge</span><span className="font-semibold text-right">{formatEcart(f.margeMin)}</span>
        {f.echeanceAt && <><span>Échéance suivante</span><span className="font-semibold text-right">{formatHHmm(f.echeanceAt)}</span></>}
        {f.decisionAvant && <><span>Décider avant</span><span className="font-semibold text-right">{formatHHmm(f.decisionAvant)}</span></>}
      </div>
      <p className="text-xs mt-2 opacity-90">{s.conseil} La décision vous appartient.</p>
    </div>
  );
}

function GrosBouton({ onClick, children, variant = "primary", disabled }: { onClick: () => void; children: React.ReactNode; variant?: "primary" | "success" | "ghost" | "warning"; disabled?: boolean }) {
  const cls = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white",
    warning: "bg-white border-2 border-amber-300 text-amber-800 hover:bg-amber-50",
    ghost: "bg-slate-100 hover:bg-slate-200 text-slate-700",
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold active:scale-[0.98] transition disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

function RaccourcisEtape({ etape, onOpen, onContribuer }: { etape: TourneePlanEtape; onOpen: () => void; onContribuer?: () => void }) {
  const gps = etape.latitude != null && etape.longitude != null;
  const item = "flex flex-col items-center gap-1 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700";
  return (
    <div className="grid grid-cols-4 gap-2">
      {gps ? (
        <a href={navigationUrl(etape.latitude!, etape.longitude!)} target="_blank" rel="noopener noreferrer" className={`${item} !bg-blue-600 !text-white hover:!bg-blue-700`}>
          <Navigation size={18} /> Naviguer
        </a>
      ) : (
        <span className={`${item} opacity-50`}>{etape.localisationMasquee ? <EyeOff size={18} /> : <Navigation size={18} />}{etape.localisationMasquee ? "Masquée" : "Sans GPS"}</span>
      )}
      <button onClick={onOpen} className={item}><BookOpen size={18} /> Consignes{etape.contenu.length ? ` (${etape.contenu.length})` : ""}</button>
      <button onClick={onOpen} className={item}><Library size={18} /> Référentiels{etape.liens.length ? ` (${etape.liens.length})` : ""}</button>
      <button onClick={onOpen} className={item}><Camera size={18} /> Photos{etape.photos.length ? ` (${etape.photos.length})` : ""}</button>
      {onContribuer && (
        <button onClick={onContribuer} className={`${item} col-span-4 !flex-row !justify-center !py-2`}>
          <MessageSquarePlus size={16} /> Contribuer
        </button>
      )}
    </div>
  );
}

export default function ParcoursView({ etapes, plan, situation, now, canAct, blocage, emit, onContribuer }: Props) {
  const [sheet, setSheet] = useState<string | null>(null);
  const prog = situation.progression;
  const byKey = new Map(etapes.map((e) => [e.key, e]));
  const courante = prog.enCoursKey ? byKey.get(prog.enCoursKey)! : prog.prochaineKey ? byKey.get(prog.prochaineKey)! : null;
  const pos = positionEtape(etapes, courante?.key ?? null);
  const run = (specs: EventSpec[]) => canAct && specs.length && emit(specs);

  const sheetEtape = sheet ? byKey.get(sheet) ?? null : null;

  // ─── Carte principale ───
  let carte: React.ReactNode = null;
  if (!canAct && blocage) {
    carte = <div className="card p-5 text-center text-slate-600 text-sm">{blocage}</div>;
  } else if (prog.termine) {
    carte = (
      <div className="card p-5 text-center space-y-2">
        <Flag size={28} className="mx-auto text-emerald-600" />
        <p className="font-bold text-slate-800 text-lg">Tournée terminée</p>
        <p className="text-sm text-slate-500">Consultez l&apos;onglet Planning pour la restitution du temps.</p>
      </div>
    );
  } else if (!prog.demarre) {
    const premier = plan.etapes.find((e) => !e.optionnelle);
    carte = (
      <div className="card p-5 space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">Départ prévu</p>
          <p className="text-4xl font-black text-slate-800 tabular-nums">{premier?.debut ? formatHHmm(premier.debut) : "—"}</p>
          {premier?.debut && now < premier.debut && <p className="text-sm text-slate-500">dans {formatDuree((premier.debut - now) / MIN)}</p>}
        </div>
        <GrosBouton onClick={() => run(demarrerTournee(etapes, prog))} variant="success"><Play size={20} /> Démarrer la tournée</GrosBouton>
      </div>
    );
  } else if (courante && prog.enCoursKey) {
    const t = plan.byKey.get(courante.key)!;
    const etat = prog.etats.get(courante.key)!;
    const restant = situation.restantEtapeMs ?? 0;
    const depasse = restant < 0;
    const Icon = ETAPE_ICON[courante.type];
    carte = (
      <div className={`card p-4 space-y-4 ring-2 ${depasse ? "ring-red-400" : "ring-blue-400"}`}>
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse"><Icon size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
              {pos ? `Étape ${pos.x} / ${pos.n} · en cours` : "Étape optionnelle · en cours"}
            </p>
            <p className="text-xl font-black text-slate-900 leading-tight">{courante.titre}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {t.debut !== null ? <>Prévu <Horaires debut={t.debut} fin={t.fin} duree={courante.dureeMin} /> · </> : null}
              Début réel {formatHHmm(etat.debut!)}
            </p>
          </div>
        </div>
        <div className={`rounded-2xl p-4 text-center ${depasse ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-800"}`}>
          <p className="text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1.5">
            <Timer size={13} /> {depasse ? "Temps prévu dépassé" : "Temps restant"}
          </p>
          <p className="text-5xl font-black tabular-nums tracking-tight mt-1">{formatChrono(restant)}</p>
          <p className="text-xs opacity-70 mt-1">sur {courante.dureeMin} min prévues</p>
        </div>
        <RaccourcisEtape etape={courante} onOpen={() => setSheet(courante.key)} onContribuer={onContribuer ? () => onContribuer(courante) : undefined} />
        <GrosBouton onClick={() => run(terminerEtape(etapes, prog, courante.key))} variant="success">
          <CheckCircle2 size={20} /> Terminer l&apos;étape
        </GrosBouton>
      </div>
    );
  } else if (courante) {
    // En route vers la prochaine étape (obligatoire ou optionnelle).
    const t = plan.byKey.get(courante.key)!;
    const f = situation.faisabilites.get(courante.key);
    const proj = situation.projections.get(courante.key);
    const Icon = ETAPE_ICON[courante.type];
    const instantane = courante.dureeMin === 0;
    carte = (
      <div className="card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${courante.optionnelle ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}><Icon size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
              <Car size={12} /> {courante.optionnelle ? "Étape optionnelle proposée" : `En route · étape ${pos?.x} / ${pos?.n}`}
            </p>
            <p className="text-xl font-black text-slate-900 leading-tight">{courante.titre}</p>
            {!courante.optionnelle && t.debut !== null && (
              <p className="text-sm text-slate-500 mt-0.5">
                Prévu <Horaires debut={t.debut} fin={t.fin} duree={courante.dureeMin} />
                {situation.arriveeProchaineProjetee && Math.abs(situation.arriveeProchaineProjetee - t.debut) >= MIN && (
                  <> · arrivée estimée <strong>{formatHHmm(situation.arriveeProchaineProjetee)}</strong></>
                )}
                {proj?.debutProjete && proj.debutProjete > (situation.arriveeProchaineProjetee ?? 0) + MIN && (
                  <> · début {formatHHmm(proj.debutProjete)} (heure imposée)</>
                )}
              </p>
            )}
            {courante.optionnelle && <p className="text-sm text-slate-500 mt-0.5">Durée {courante.dureeMin} min · détour {courante.surcoutTrajetMin ?? 0} min</p>}
          </div>
        </div>
        {f && <FaisabiliteCard f={f} />}
        <RaccourcisEtape etape={courante} onOpen={() => setSheet(courante.key)} onContribuer={onContribuer ? () => onContribuer(courante) : undefined} />
        <GrosBouton onClick={() => run(demarrerEtape(etapes, prog, courante.key))} variant={courante.type === "RESTITUTION" && instantane ? "success" : "primary"}>
          {courante.type === "RESTITUTION" && instantane ? <><Flag size={20} /> Terminer la tournée</> : instantane ? <><CheckCircle2 size={20} /> Valider le passage</> : <><Play size={20} /> Arrivé — démarrer l&apos;étape</>}
        </GrosBouton>
        {courante.optionnelle && (
          <GrosBouton onClick={() => run(ignorerEtape(courante.key))} variant="warning"><SkipForward size={20} /> Ignorer cette étape optionnelle</GrosBouton>
        )}
      </div>
    );
  }

  // ─── Timeline ───
  return (
    <div className="space-y-5">
      {carte}

      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Parcours</h2>
        <ol className="card divide-y divide-slate-100">
          {etapes.map((e, i) => {
            const t = plan.byKey.get(e.key)!;
            const s = prog.etats.get(e.key)!;
            const proj = situation.projections.get(e.key);
            const f = situation.faisabilites.get(e.key);
            const Icon = ETAPE_ICON[e.type];
            const actuelle = e.key === prog.enCoursKey || (!prog.enCoursKey && e.key === prog.prochaineKey);
            const suivanteObligatoire = etapes.slice(i + 1).some((x) => !x.optionnelle);
            const decalage = proj?.debutProjete && t.debut !== null ? (proj.debutProjete - t.debut) / MIN : 0;
            return (
              <li key={e.key} className={actuelle ? "bg-blue-50/70" : ""}>
                <button onClick={() => setSheet(e.key)} className="w-full flex items-start gap-3 px-4 py-3 text-left">
                  <span className="w-[74px] flex-shrink-0 text-xs tabular-nums pt-0.5">
                    {e.optionnelle ? (
                      <span className="font-bold text-amber-600">Optionnel</span>
                    ) : (
                      <>
                        <span className={`font-bold ${s.statut === "terminee" ? "text-slate-400" : "text-slate-800"}`}>{formatHHmm(t.debut!)}</span>
                        {e.dureeMin > 0 && <span className="text-slate-400"> – {formatHHmm(t.fin!)}</span>}
                      </>
                    )}
                  </span>
                  <span className="flex-shrink-0 pt-0.5">
                    {s.statut === "terminee" ? (
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    ) : s.statut === "en_cours" ? (
                      <span className="block w-5 h-5 rounded-full bg-blue-600 ring-4 ring-blue-200 animate-pulse" />
                    ) : s.statut === "ignoree" ? (
                      <SkipForward size={20} className="text-amber-500" />
                    ) : s.statut === "non_realisee" ? (
                      <Circle size={20} className="text-slate-300" />
                    ) : (
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${e.optionnelle ? "border-dashed border-amber-400" : "border-slate-300"}`}>
                        <Icon size={10} className="text-slate-400" />
                      </span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold ${s.statut === "non_realisee" ? "line-through text-slate-400" : "text-slate-800"}`}>{e.titre}</span>
                    <span className="block text-xs text-slate-500 mt-0.5 space-x-2">
                      {s.statut === "terminee" && s.debut !== null && s.fin !== null && (
                        <span>
                          Réel {formatHHmm(s.debut)}{e.dureeMin > 0 && ` → ${formatHHmm(s.fin)}`}
                          {e.dureeMin > 0 && (() => {
                            const ec = (s.fin - s.debut) / MIN - e.dureeMin;
                            return Math.abs(ec) >= 1 ? <span className={ec > 0 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold"}> ({formatEcart(ec)})</span> : null;
                          })()}
                        </span>
                      )}
                      {s.statut === "en_cours" && <span className="text-blue-700 font-semibold">En cours depuis {formatHHmm(s.debut!)}</span>}
                      {s.statut === "ignoree" && <span className="text-amber-700">⏭️ Ignorée — étape optionnelle</span>}
                      {s.statut === "non_realisee" && <span>Non réalisée</span>}
                      {s.statut === "a_venir" && !e.optionnelle && Math.abs(decalage) >= 1 && proj?.debutProjete && (
                        <span className={decalage > 0 ? "text-orange-600" : "text-emerald-700"}>
                          <Clock size={10} className="inline -mt-0.5" /> estimé {formatHHmm(proj.debutProjete)}
                        </span>
                      )}
                      {s.statut === "a_venir" && e.optionnelle && f && <FaisabiliteCard f={f} compact />}
                    </span>
                  </span>
                </button>
                {!e.optionnelle && suivanteObligatoire && e.trajetSuivanteMin > 0 && (
                  <p className="pl-[118px] pb-2 -mt-1.5 text-[11px] text-slate-400 flex items-center gap-1"><Car size={11} /> {e.trajetSuivanteMin} min</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {sheetEtape && (() => {
        const s = prog.etats.get(sheetEtape.key)!;
        const t = plan.byKey.get(sheetEtape.key)!;
        const actions: React.ReactNode[] = [];
        if (canAct && prog.demarre && !prog.termine) {
          if (s.statut === "a_venir" && sheetEtape.key !== prog.enCoursKey) {
            actions.push(
              <GrosBouton key="go" onClick={() => { run(demarrerEtape(etapes, prog, sheetEtape.key)); setSheet(null); }}>
                <Play size={18} /> {sheetEtape.dureeMin === 0 ? "Valider le passage" : "Démarrer cette étape"}
              </GrosBouton>,
            );
            if (sheetEtape.optionnelle) {
              actions.push(
                <GrosBouton key="skip" variant="warning" onClick={() => { run(ignorerEtape(sheetEtape.key)); setSheet(null); }}>
                  <SkipForward size={18} /> Ignorer
                </GrosBouton>,
              );
            }
          }
          if (s.statut === "en_cours") {
            actions.push(
              <GrosBouton key="end" variant="success" onClick={() => { run(terminerEtape(etapes, prog, sheetEtape.key)); setSheet(null); }}>
                <CheckCircle2 size={18} /> Terminer l&apos;étape
              </GrosBouton>,
            );
          }
          if (s.statut === "ignoree" && !s.implicite) {
            actions.push(
              <GrosBouton key="undo" variant="ghost" onClick={() => { run(reprendreEtape(sheetEtape.key)); setSheet(null); }}>
                <RotateCcw size={18} /> Ne plus ignorer
              </GrosBouton>,
            );
          }
        }
        if (onContribuer) {
          actions.push(
            <button key="contrib" onClick={() => { onContribuer(sheetEtape); setSheet(null); }} className="text-sm font-semibold text-slate-600 py-2 flex items-center justify-center gap-1.5">
              <MessageSquarePlus size={16} /> Contribuer sur cette étape
            </button>,
          );
        }
        return (
          <EtapeSheet
            etape={sheetEtape}
            onClose={() => setSheet(null)}
            entete={sheetEtape.optionnelle ? `Optionnelle · ${sheetEtape.dureeMin} min · détour ${sheetEtape.surcoutTrajetMin ?? 0} min` : <>Prévu <Horaires debut={t.debut} fin={t.fin} duree={sheetEtape.dureeMin} /> · {sheetEtape.dureeMin} min</>}
            actions={actions.length ? actions : undefined}
          />
        );
      })()}
    </div>
  );
}
