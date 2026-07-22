"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { fmtDateTimeFr } from "@/lib/cil/format";
import { correspondanceCil, correspondanceFiche } from "@/lib/rci/reprise";
import { RCI_EVENT_TYPE_LABELS, type RciEventType } from "@/lib/rci/guidance";

export type SourceCil = {
  id: string;
  reference: string | null;
  lieu: string;
  type: string;
  typeLibre: string | null;
  status: string;
  occurredAt: string;
};
export type SourceSession = {
  id: string;
  ficheTitre: string;
  ficheSlug: string;
  status: string;
  startedAt: string;
};

const LIBELLES_INCIDENT: Record<string, string> = {
  INCENDIE: "Incendie",
  ACCIDENT_PERSONNE: "Accident de personne",
  OBSTACLE: "Obstacle",
  AUTRE: "Autre",
};

const libelleCil = (i: SourceCil) =>
  i.typeLibre?.trim() || LIBELLES_INCIDENT[i.type] || "Incident";

/**
 * Sources terrain du RCI — Livret CIL et session de fiche réflexe.
 *
 * Les deux sont **cumulables** : un même événement peut avoir été suivi en
 * session pendant l'action puis en Livret CIL sur site. Chaque emplacement se
 * rattache et se détache indépendamment.
 */
export default function RciSourceCard({
  rciId,
  readOnly,
  cilIncident,
  session,
  typologieCourante,
  nbPropositions,
  onAnalyser,
  onTypologie,
}: {
  rciId: string;
  readOnly: boolean;
  cilIncident: SourceCil | null;
  session: SourceSession | null;
  /** Typologie déjà retenue dans le RCI — « autre » = pas encore choisie. */
  typologieCourante: RciEventType;
  /** Propositions en attente d'arbitrage, pour l'indicateur. */
  nbPropositions: number;
  /** Demande au wizard de recalculer les propositions de reprise. */
  onAnalyser: (typologie?: RciEventType) => Promise<void>;
  /** Applique la typologie retenue (sans écraser un choix existant). */
  onTypologie: (t: RciEventType) => void;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<"cil" | "session" | null>(null);
  const [sources, setSources] = useState<{
    incidents: SourceCil[];
    sessions: SourceSession[];
  } | null>(null);
  const [chargement, setChargement] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [aChoisir, setAChoisir] = useState<{
    famille: "cil" | "session";
    id: string;
    choix: RciEventType[];
  } | null>(null);

  useEffect(() => {
    if (!ouvert || sources || chargement) return;
    setChargement(true);
    fetch("/api/rci/sources")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then(setSources)
      .catch(() => toast.error("Chargement des sources impossible"))
      .finally(() => setChargement(false));
  }, [ouvert, sources, chargement]);

  /**
   * La typologie conditionne tout le guidage : quand la source n'en désigne
   * qu'une, on la retient d'office ; quand elle en autorise plusieurs, on la
   * fait trancher ici. Jamais de question si l'agent l'a déjà fixée.
   */
  function choisirSource(famille: "cil" | "session", id: string, cle: string) {
    const corr =
      famille === "cil" ? correspondanceCil(cle) : correspondanceFiche(cle);
    if (corr.genre === "ambigue" && typologieCourante === "autre") {
      setAChoisir({ famille, id, choix: corr.choix });
      return;
    }
    rattacher(
      famille,
      id,
      corr.genre === "certaine" ? corr.typologie : undefined,
    );
  }

  async function rattacher(
    famille: "cil" | "session",
    id: string | null,
    typologie?: RciEventType,
  ) {
    setEnCours(true);
    try {
      // Un seul emplacement est touché : rattacher un CIL ne détache pas la
      // session, et réciproquement.
      const res = await fetch(`/api/rci/${rciId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          famille === "cil" ? { cilIncidentId: id } : { sessionId: id },
        ),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "Rattachement impossible");
        return;
      }
      if (typologie) onTypologie(typologie);
      toast.success(id ? "Source rattachée" : "Source détachée");
      setOuvert(null);
      setAChoisir(null);
      router.refresh();
      if (id) await onAnalyser(typologie);
    } finally {
      setEnCours(false);
    }
  }

  function Emplacement({
    famille,
    titre,
    libelle,
    detail,
    href,
  }: {
    famille: "cil" | "session";
    titre: string;
    libelle: string | null;
    detail: string;
    href: string | null;
  }) {
    const rattachee = libelle !== null;
    return (
      <div
        className={`rounded-xl border p-3 ${
          rattachee ? "border-blue-200 bg-blue-50/50" : "border-dashed border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-500">
            {titre}
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setOuvert(ouvert === famille ? null : famille)
                }
                className="text-[11px] font-semibold text-blue-800 hover:underline"
              >
                {rattachee ? "Changer" : "Rattacher"}
              </button>
              {rattachee && (
                <button
                  type="button"
                  onClick={() => rattacher(famille, null)}
                  disabled={enCours}
                  title="Détacher"
                  className="text-[11px] px-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
        {rattachee ? (
          <div className="mt-1.5 flex items-end justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{libelle}</p>
              {detail && (
                <p className="text-[11px] text-slate-600">{detail}</p>
              )}
            </div>
            {href && (
              <Link
                href={href}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-blue-300 text-blue-800 bg-white hover:bg-blue-50 shrink-0"
              >
                Ouvrir →
              </Link>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-slate-400 italic">
            Aucun rattachement
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="card p-5 lg:p-6 mb-6 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">
            Sources terrain
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Rattachez le Livret CIL et/ou la session pour naviguer entre les
            modules et vous voir proposer les données déjà saisies.
          </p>
        </div>
        {(cilIncident || session) && !readOnly && (
          <button
            type="button"
            onClick={() => onAnalyser()}
            disabled={enCours}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-50 shrink-0 inline-flex items-center gap-1.5"
          >
            <Icon.Search className="w-3.5 h-3.5" />
            Chercher des données à reprendre
            {nbPropositions > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-800 text-white text-[10px] font-bold">
                {nbPropositions}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Emplacement
          famille="cil"
          titre="Livret CIL"
          libelle={cilIncident ? libelleCil(cilIncident) : null}
          detail={
            cilIncident
              ? [
                  cilIncident.reference,
                  cilIncident.lieu,
                  fmtDateTimeFr(cilIncident.occurredAt),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : ""
          }
          href={cilIncident ? `/cil/${cilIncident.id}` : null}
        />
        <Emplacement
          famille="session"
          titre="Session de fiche réflexe"
          libelle={session ? session.ficheTitre : null}
          detail={session ? fmtDateTimeFr(session.startedAt) : ""}
          href={session ? `/sessions/${session.id}` : null}
        />
      </div>

      {aChoisir && !readOnly && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            Cette source couvre plusieurs situations
          </p>
          <p className="text-[11px] text-amber-900/80 mt-0.5 mb-2">
            Précisez le type d&apos;événement : il détermine les rubriques
            attendues du RCI. Vous pourrez le modifier ensuite à l&apos;étape
            « Nature ».
          </p>
          <div className="flex flex-wrap gap-2">
            {aChoisir.choix.map((t) => (
              <button
                key={t}
                type="button"
                disabled={enCours}
                onClick={() => rattacher(aChoisir.famille, aChoisir.id, t)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-400 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                {RCI_EVENT_TYPE_LABELS[t]}
              </button>
            ))}
            <button
              type="button"
              disabled={enCours}
              onClick={() => setAChoisir(null)}
              className="text-xs px-3 py-1.5 rounded-lg text-amber-900/70 hover:underline"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {ouvert && !readOnly && !aChoisir && (
        <div className="border-t border-slate-200 pt-3">
          {chargement && <p className="text-xs text-slate-500">Chargement…</p>}
          {sources && ouvert === "cil" && (
            <Liste
              vide="Aucun incident"
              items={sources.incidents.map((i) => ({
                id: i.id,
                cle: i.type,
                titre: libelleCil(i),
                detail: [i.reference, i.lieu, fmtDateTimeFr(i.occurredAt)]
                  .filter(Boolean)
                  .join(" · "),
              }))}
              enCours={enCours}
              onChoisir={(id, cle) => choisirSource("cil", id, cle)}
            />
          )}
          {sources && ouvert === "session" && (
            <Liste
              vide="Aucune session"
              items={sources.sessions.map((s) => ({
                id: s.id,
                cle: s.ficheSlug,
                titre: s.ficheTitre,
                detail:
                  fmtDateTimeFr(s.startedAt) +
                  (s.status === "active" ? " · en cours" : ""),
              }))}
              enCours={enCours}
              onChoisir={(id, cle) => choisirSource("session", id, cle)}
            />
          )}
        </div>
      )}
    </section>
  );
}

function Liste({
  items,
  vide,
  enCours,
  onChoisir,
}: {
  items: { id: string; cle: string; titre: string; detail: string }[];
  vide: string;
  enCours: boolean;
  onChoisir: (id: string, cle: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-400 italic">{vide}</p>;
  }
  return (
    <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
      {items.map((i) => (
        <li key={i.id}>
          <button
            type="button"
            disabled={enCours}
            onClick={() => onChoisir(i.id, i.cle)}
            className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
          >
            <span className="font-semibold text-slate-700">{i.titre}</span>
            <span className="block text-[10px] text-slate-500">{i.detail}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
