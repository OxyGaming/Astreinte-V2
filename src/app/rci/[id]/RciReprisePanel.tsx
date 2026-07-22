"use client";

import type { RciPayload } from "@/lib/rci/fields";
import {
  champVide,
  estDivergent,
  grouperPropositions,
  type GroupeProposition,
  type PropositionChamp,
  type SourceGenre,
} from "@/lib/rci/reprise";
import { type RciStepKey } from "@/lib/rci/guidance";

/** Rend une valeur proposée lisible (les ternaires sortent en oui/non). */
function afficher(v: unknown): string {
  if (v === true) return "oui";
  if (v === false) return "non";
  const s = String(v ?? "");
  return s.length > 120 ? s.slice(0, 120) + "…" : s;
}

const LIBELLE_SOURCE: Record<SourceGenre, string> = {
  cil: "Livret CIL",
  session: "Session",
};

function Badges({ sources }: { sources: SourceGenre[] }) {
  return (
    <>
      {sources.map((s) => (
        <span
          key={s}
          className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mr-1 ${
            s === "cil"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-purple-50 text-purple-700"
          }`}
        >
          {LIBELLE_SOURCE[s]}
        </span>
      ))}
    </>
  );
}

/**
 * Arbitrage des données reprises, **champ par champ**.
 *
 * Une ligne = un champ. Quand les deux sources s'accordent, la valeur est
 * proposée une fois, créditée aux deux. Quand elles **divergent**, la ligne
 * présente les valeurs concurrentes et l'agent tranche : l'application n'a
 * aucune raison légitime de préférer l'une à l'autre.
 *
 * Rien ne s'applique sans un clic — un RCI est cosigné, chaque donnée doit
 * être assumée par celui qui le signe.
 */
export default function RciReprisePanel({
  propositions,
  payload,
  libellesEtapes,
  onAccepter,
  onIgnorer,
  onToutIgnorer,
}: {
  propositions: PropositionChamp[];
  payload: RciPayload;
  libellesEtapes: Record<string, string>;
  /** Applique la valeur retenue pour ce champ. */
  onAccepter: (retenu: Pick<PropositionChamp, "cle" | "valeur">) => void;
  /** Écarte toutes les propositions visant ce champ. */
  onIgnorer: (cle: PropositionChamp["cle"]) => void;
  onToutIgnorer: () => void;
}) {
  if (propositions.length === 0) return null;

  const groupes = grouperPropositions(propositions);
  const nbDivergents = groupes.filter(estDivergent).length;

  // Regroupe par étape du wizard, dans l'ordre du RCI papier.
  const ordre = Object.keys(libellesEtapes) as RciStepKey[];
  const parEtape = new Map<string, GroupeProposition[]>();
  for (const g of groupes) {
    const l = parEtape.get(g.etape) ?? [];
    l.push(g);
    parEtape.set(g.etape, l);
  }
  const etapes = ordre.filter((e) => parEtape.has(e));

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Données proposées par les sources terrain
          </h2>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {groupes.length} champ{groupes.length > 1 ? "s" : ""} à examiner
            {nbDivergents > 0 && (
              <>
                {" — dont "}
                <span className="font-semibold text-amber-800">
                  {nbDivergents} où les sources divergent
                </span>
              </>
            )}
            . Rien n&apos;est appliqué sans votre accord.
          </p>
        </div>
        <button
          type="button"
          onClick={onToutIgnorer}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2 shrink-0"
        >
          Tout écarter
        </button>
      </div>

      <div className="space-y-3">
        {etapes.map((etape) => (
          <div key={etape}>
            <p className="text-[10px] font-mono uppercase tracking-wide text-slate-500 mb-1.5">
              {libellesEtapes[etape]}
            </p>
            <ul className="space-y-1.5">
              {parEtape.get(etape)!.map((g) => {
                const divergent = estDivergent(g);
                const actuel = (payload as Record<string, unknown>)[
                  g.cle as string
                ];
                const vide = champVide(payload, g.cle);
                return (
                  <li
                    key={g.cle as string}
                    className={`bg-white rounded-lg border px-3 py-2 ${
                      divergent ? "border-amber-300" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700">
                            {g.libelle}
                          </span>
                          {divergent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              SOURCES DIVERGENTES
                            </span>
                          )}
                        </div>
                        {!vide && (
                          <p className="text-[11px] text-rose-700 mt-0.5">
                            Valeur actuelle :{" "}
                            <span className="font-mono">{afficher(actuel)}</span>
                          </p>
                        )}
                      </div>
                      {!divergent && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onAccepter({
                                cle: g.cle,
                                valeur: g.options[0].valeur,
                              })
                            }
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-800 text-white hover:bg-blue-900"
                          >
                            Reprendre
                          </button>
                          <button
                            type="button"
                            onClick={() => onIgnorer(g.cle)}
                            className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                          >
                            Écarter
                          </button>
                        </div>
                      )}
                    </div>

                    {divergent ? (
                      // Les valeurs concurrentes sont elles-mêmes les boutons :
                      // choisir, c'est cliquer sur la valeur que l'on retient.
                      <div className="mt-2 space-y-1.5">
                        {g.options.map((o, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              onAccepter({ cle: g.cle, valeur: o.valeur })
                            }
                            className="w-full text-left rounded-lg border border-slate-200 px-2.5 py-1.5 hover:border-blue-500 hover:bg-blue-50/60 transition-colors group"
                          >
                            <span className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="min-w-0">
                                <Badges sources={o.sources} />
                                <span className="block text-[12px] text-slate-800 mt-0.5 whitespace-pre-wrap break-words">
                                  {afficher(o.valeur)}
                                </span>
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-800 shrink-0">
                                Retenir cette valeur
                              </span>
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => onIgnorer(g.cle)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline underline-offset-2"
                        >
                          Ne rien reprendre pour ce champ
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-700 mt-1">
                        <Badges sources={g.options[0].sources} />
                        <span className="block mt-0.5 font-medium whitespace-pre-wrap break-words">
                          {afficher(g.options[0].valeur)}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
