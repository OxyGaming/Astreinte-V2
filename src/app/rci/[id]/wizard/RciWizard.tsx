"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import {
  emptyPayload,
  type RciPayload,
  type RciPhotos,
} from "@/lib/rci/fields";
import {
  RCI_EVENT_TYPE_LABELS,
  missingByStep,
  missingRequired,
  normalizeEventType,
  type RciEventType,
} from "@/lib/rci/guidance";
import {
  accepter,
  propositionsUtiles,
  type PropositionChamp,
} from "@/lib/rci/reprise";
import { GuidanceProvider } from "./guidance-ui";
import { todayFr } from "./fields-ui";
import RciSourceCard, {
  type SourceCil,
  type SourceSession,
} from "../RciSourceCard";
import RciReprisePanel from "../RciReprisePanel";
import StepQuand from "./steps/StepQuand";
import StepNature from "./steps/StepNature";
import StepOu from "./steps/StepOu";
import StepInstallations from "./steps/StepInstallations";
import StepMobiles from "./steps/StepMobiles";
import StepQui from "./steps/StepQui";
import StepMesures from "./steps/StepMesures";
import StepPresents from "./steps/StepPresents";
import StepRecit from "./steps/StepRecit";
import type { StepDef } from "./types";

/**
 * Étapes calquées sur les blocs du RCI papier — l'ordre des rubriques du
 * formulaire officiel est celui que les opérateurs ont en tête sur le terrain.
 * Les `key` sont celles de la grille de guidage ([[guidance]]), ce qui permet
 * de renvoyer directement sur la bonne étape depuis le récapitulatif.
 */
const STEPS: StepDef[] = [
  { key: "quand", label: "Quand", short: "1. Quand", component: StepQuand },
  { key: "nature", label: "Nature", short: "2. Nature", component: StepNature },
  { key: "ou", label: "Où", short: "3. Où", component: StepOu },
  {
    key: "installations",
    label: "Installations",
    short: "4. Installations",
    component: StepInstallations,
  },
  {
    key: "mobiles",
    label: "Mobiles",
    short: "5. Mobiles",
    component: StepMobiles,
  },
  { key: "qui", label: "Qui ?", short: "6. Qui", component: StepQui },
  {
    key: "acteurs",
    label: "Mesures & acteurs",
    short: "7. Mesures",
    component: StepMesures,
  },
  {
    key: "presents",
    label: "Présents sur place",
    short: "8. Présents",
    component: StepPresents,
  },
  {
    key: "recit",
    label: "Récit + signatures",
    short: "9. Récit",
    component: StepRecit,
  },
];

/**
 * Relit un payload stocké en ne conservant que les clés actuellement définies.
 *
 * Les brouillons créés avant une évolution du schéma contiennent des clés qui
 * n'existent plus (reliquats sans contrepartie dans le RCI officiel). Sans ce
 * filtrage, un simple `{...emptyPayload(), ...v}` les réinjecterait à chaque
 * ouverture et les ré-enregistrerait indéfiniment.
 */
function parsePayload(s: string): RciPayload {
  const base = emptyPayload();
  try {
    const v = JSON.parse(s) as Record<string, unknown>;
    if (!v || typeof v !== "object") return base;
    const out = base as unknown as Record<string, unknown>;
    for (const k of Object.keys(base)) {
      if (k in v) out[k] = v[k];
    }
    return out as unknown as RciPayload;
  } catch {
    return base;
  }
}

/**
 * Pré-remplit les champs « signatures » et « RCI établi par » à partir de
 * l'utilisateur courant — visible et modifiable dans le wizard. N'altère
 * que les champs vides : on n'écrase jamais une saisie existante.
 */
function applyDefaults(p: RciPayload, authorName: string): RciPayload {
  const out = { ...p };
  if (!out.rci_etabli_le) out.rci_etabli_le = todayFr();
  if (!out.rci_etabli_par) out.rci_etabli_par = authorName;
  if (!out.sig_eic_nom_fonction) out.sig_eic_nom_fonction = authorName;
  if (!out.sig_eic_etablissement) out.sig_eic_etablissement = "EIC RAL";
  return out;
}

export default function RciWizard({
  rciId,
  initialPayload,
  initialDossierNumber,
  initialEventAt,
  initialTitle,
  status,
  authorName,
  cilIncident,
  session,
}: {
  rciId: string;
  initialPayload: string;
  initialDossierNumber: string | null;
  initialEventAt: string | null;
  initialTitle: string | null;
  status: string;
  authorName: string;
  cilIncident: SourceCil | null;
  session: SourceSession | null;
}) {
  const router = useRouter();
  const readOnly = status === "FINAL";
  const [stepIdx, setStepIdx] = useState(0);
  const [payload, setPayload] = useState<RciPayload>(() => {
    const p = parsePayload(initialPayload);
    // Hydratation depuis colonnes scalaires si payload pas encore peuplé
    if (!p.dossier_numero && initialDossierNumber) {
      p.dossier_numero = initialDossierNumber;
    }
    if (!p.nature && initialTitle) p.nature = initialTitle;
    return applyDefaults(p, authorName);
  });
  // Photos : non persistées côté serveur dans la v1 (on les garde en mémoire
  // de la session wizard). À déplacer en BDD si besoin de partage offline.
  const [photos, setPhotos] = useState<RciPhotos>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGaps, setShowGaps] = useState(false);
  /**
   * Propositions telles que renvoyées par les sources, non filtrées.
   * Le tri de ce qui reste pertinent est dérivé du payload courant
   * (`propositionsAExaminer`) et non figé ici : une valeur devenue identique —
   * parce qu'on vient de l'accepter, que la typologie a été posée au
   * rattachement, ou que l'agent l'a saisie à la main — disparaît aussitôt.
   */
  const [propositions, setPropositions] = useState<PropositionChamp[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>(initialPayload);

  const eventType = normalizeEventType(payload.event_type);
  const gaps = useMemo(
    () => missingRequired(payload, photos, eventType),
    [payload, photos, eventType],
  );
  const gapsByStep = useMemo(
    () => missingByStep(payload, photos, eventType),
    [payload, photos, eventType],
  );
  /**
   * Ce qu'il reste réellement à arbitrer : une proposition dont la valeur est
   * déjà en place n'apprend rien et ne doit pas être présentée comme un
   * remplacement. Dérivé du payload, donc toujours à jour.
   */
  const propositionsAExaminer = useMemo(
    () => propositionsUtiles(payload, propositions),
    [payload, propositions],
  );
  // La pastille compte des CHAMPS, pas des propositions : deux sources en
  // désaccord sur une même donnée restent un seul arbitrage à rendre.
  const nbChampsAExaminer = useMemo(
    () => new Set(propositionsAExaminer.map((p) => p.cle as string)).size,
    [propositionsAExaminer],
  );

  function patch(updates: Partial<RciPayload>) {
    if (readOnly) return;
    setPayload((p) => ({ ...p, ...updates }));
  }
  function patchPhotos(updates: Partial<RciPhotos>) {
    if (readOnly) return;
    setPhotos((p) => ({ ...p, ...updates }));
  }

  // Autosave debounced — sauvegarde payload, eventAt et dossierNumber côté serveur.
  useEffect(() => {
    if (readOnly) return;
    const json = JSON.stringify(payload);
    if (json === lastSavedJson.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        // Calcule eventAt depuis date + heure si possible
        let eventAt: string | null = null;
        const dateMatch = payload.date_evenement.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        const heureMatch = payload.heure_evenement.match(/^(\d{1,2})h(\d{2})$/);
        if (dateMatch && heureMatch) {
          const [, d, m, y] = dateMatch;
          const [, h, mi] = heureMatch;
          eventAt = new Date(
            Number(y),
            Number(m) - 1,
            Number(d),
            Number(h),
            Number(mi),
          ).toISOString();
        }
        const res = await fetch(`/api/rci/${rciId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: json,
            dossierNumber: payload.dossier_numero || null,
            title: payload.nature || null,
            eventAt,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          toast.error(j.error || "Sauvegarde échouée");
          return;
        }
        lastSavedJson.current = json;
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, rciId, readOnly]);

  /**
   * Retient la typologie déterminée au rattachement — jamais au détriment d'un
   * choix déjà fait : c'est l'agent qui qualifie l'événement, pas la source.
   */
  function appliquerTypologie(t: RciEventType) {
    setPayload((p) =>
      normalizeEventType(p.event_type) === "autre"
        ? { ...p, event_type: t }
        : p,
    );
  }

  /**
   * Interroge les sources rattachées et prépare les propositions à arbitrer.
   *
   * Rien n'est appliqué ici : le panneau de reprise laisse l'agent accepter ou
   * écarter chaque champ. Les propositions sont stockées brutes ; le tri de ce
   * qui reste pertinent est dérivé du payload (`propositionsAExaminer`).
   */
  async function analyser(typologie?: RciEventType) {
    const res = await fetch(`/api/rci/${rciId}/reprise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typologie }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Analyse des sources impossible");
      return;
    }
    const { propositions: brutes } = (await res.json()) as {
      propositions: PropositionChamp[];
    };
    setPropositions(brutes);
    // Le décompte annoncé doit être celui que l'agent verra : on applique donc
    // ici le même filtre que le rendu, sur le payload de cet instant.
    const nb = new Set(
      propositionsUtiles(payload, brutes).map((p) => p.cle as string),
    ).size;
    toast[nb ? "success" : "info"](
      nb
        ? `${nb} champ${nb > 1 ? "s" : ""} à examiner.`
        : "Rien de nouveau à reprendre : les sources ne disent rien que le RCI ne dise déjà.",
    );
  }

  /** Retient la valeur choisie pour un champ — décision explicite de l'agent. */
  function accepterProposition(retenu: Pick<PropositionChamp, "cle" | "valeur">) {
    setPayload((courant) => accepter(courant, retenu));
    // L'arbitrage est fait : on retire toutes les propositions du champ, y
    // compris la valeur concurrente qui n'a pas été retenue.
    setPropositions((l) => l.filter((x) => x.cle !== retenu.cle));
  }

  /** Écarte le champ dans son ensemble, quelles que soient les sources. */
  function ignorerProposition(cle: PropositionChamp["cle"]) {
    setPropositions((l) => l.filter((x) => x.cle !== cle));
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/rci/${rciId}/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, photos }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rci-${payload.dossier_numero || rciId.slice(0, 8)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Document généré");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(`Génération échouée : ${msg}`);
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  const Current = STEPS[stepIdx].component;

  return (
    <GuidanceProvider payload={payload} photos={photos}>
      <RciSourceCard
        rciId={rciId}
        readOnly={readOnly}
        cilIncident={cilIncident}
        session={session}
        typologieCourante={eventType}
        nbPropositions={nbChampsAExaminer}
        onAnalyser={analyser}
        onTypologie={appliquerTypologie}
      />

      {!readOnly && (
        <RciReprisePanel
          propositions={propositionsAExaminer}
          payload={payload}
          libellesEtapes={Object.fromEntries(
            STEPS.map((s) => [s.key, s.label]),
          )}
          onAccepter={accepterProposition}
          onIgnorer={ignorerProposition}
          onToutIgnorer={() => setPropositions([])}
        />
      )}
      <div className="card p-5 lg:p-6 space-y-5">
        {/* Stepper — la pastille compte les rubriques obligatoires encore vides. */}
        <ol className="flex gap-1 flex-wrap text-[11px]">
          {STEPS.map((s, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx;
            const missing = gapsByStep[s.key] ?? 0;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={`px-2.5 py-1 rounded-md border transition-colors inline-flex items-center gap-1.5 ${
                    active
                      ? "bg-blue-800 text-white border-blue-800"
                      : done
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s.short}
                  {missing > 0 && (
                    <span
                      title={`${missing} rubrique(s) obligatoire(s) à compléter`}
                      className={`inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {missing}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Récapitulatif de complétude, piloté par la typologie déclarée. */}
        <div
          className={`rounded-xl border px-3 py-2 ${
            gaps.length === 0
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs">
              <span className="font-semibold text-slate-700">
                {RCI_EVENT_TYPE_LABELS[eventType]}
              </span>
              <span className="text-slate-400"> · </span>
              {gaps.length === 0 ? (
                <span className="text-emerald-800 font-medium">
                  toutes les rubriques attendues sont renseignées
                </span>
              ) : (
                <span className="text-amber-900 font-medium">
                  {gaps.length} rubrique{gaps.length > 1 ? "s" : ""} obligatoire
                  {gaps.length > 1 ? "s" : ""} à compléter
                </span>
              )}
            </p>
            {gaps.length > 0 && (
              <button
                type="button"
                onClick={() => setShowGaps((v) => !v)}
                className="text-[11px] font-semibold text-amber-900 underline underline-offset-2"
              >
                {showGaps ? "Masquer" : "Voir la liste"}
              </button>
            )}
          </div>
          {showGaps && gaps.length > 0 && (
            <ul className="mt-2 space-y-1">
              {gaps.map(({ group }) => (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = STEPS.findIndex((s) => s.key === group.step);
                      if (idx >= 0) setStepIdx(idx);
                      setShowGaps(false);
                    }}
                    className="text-[11px] text-left text-amber-900 hover:underline"
                  >
                    → {group.label}
                    <span className="text-amber-700/70">
                      {" "}
                      (
                      {STEPS.find((s) => s.key === group.step)?.label ??
                        group.step}
                      )
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Statut autosave */}
        <div className="text-[10px] text-slate-400 font-mono h-3">
          {saving
            ? "Sauvegarde…"
            : savedAt
              ? `Sauvegardé à ${savedAt.toLocaleTimeString("fr-FR")}`
              : "Modifications enregistrées automatiquement."}
        </div>

        {/* Étape courante */}
        <div className="min-h-[300px]">
          <Current
            payload={payload}
            patch={patch}
            photos={photos}
            patchPhotos={patchPhotos}
            readOnly={readOnly}
          />
        </div>

        {/* Navigation + génération.
            L'indicateur d'étape passe sur sa propre ligne quand la largeur
            manque (mobile) : les deux boutons restent alignés sur une seule
            rangée (justify-between), icônes aux extrémités. */}
        <div className="pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-medium text-center mb-2 sm:hidden">
            Étape {stepIdx + 1} / {STEPS.length} — {STEPS[stepIdx].label}
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0}
              className="text-xs text-slate-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 disabled:opacity-40 flex-shrink-0"
            >
              <Icon.ChevronLeft className="w-4 h-4 inline -ml-1" /> Précédent
            </button>
            <div className="hidden sm:block text-xs text-slate-500 font-medium text-center min-w-0 truncate">
              Étape {stepIdx + 1} / {STEPS.length} — {STEPS[stepIdx].label}
            </div>
            {stepIdx < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                className="btn btn-primary flex-shrink-0"
              >
                Suivant <Icon.ChevronLeft className="w-4 h-4 rotate-180 -mr-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={generate}
                disabled={generating || readOnly}
                className="btn btn-primary flex-shrink-0"
              >
                <Icon.Plus className="w-4 h-4" />
                {generating ? "Génération…" : "Générer le .docx"}
              </button>
            )}
          </div>
        </div>
        {/* initialEventAt non utilisé mais accepté pour API future */}
        {void initialEventAt}
      </div>
    </GuidanceProvider>
  );
}
