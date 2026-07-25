"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Icon } from "@/components/icons";
import RciWizard from "./wizard/RciWizard";
import ModuleLinks from "@/components/ModuleLinks";
import { useDeletionDialog } from "@/components/DeletionImpactDialog";
import type { SourceCil, SourceSession } from "./RciSourceCard";

type Rci = {
  id: string;
  status: string;
  title: string | null;
  /** Titre encore automatique (suit la Nature) vs personnalisé par l'agent. */
  titleAuto: boolean;
  dossierNumber: string | null;
  eventAt: string | null;
  payload: string;
  authorName: string;
  // Portage : `teamName` retiré — pas de modèle `Team` dans cette application.
  updatedAt: string;
  /// Source terrain rattachée (exclusives en pratique, cf. RciSourceCard).
  cilIncident: SourceCil | null;
  session: SourceSession | null;
};


export default function RciEditorClient({
  rci,
  isAdmin = false,
  linkedCil = null,
  linkedSession = null,
}: {
  rci: Rci;
  /** Suppression réservée à l'administrateur (bouton masqué sinon). */
  isAdmin?: boolean;
  /** Voisins du triangle (résolution transitive) pour le bandeau de nav. */
  linkedCil?: { id: string } | null;
  linkedSession?: { id: string; ficheSlug: string } | null;
}) {
  const router = useRouter();
  const { dialog, requestDelete } = useDeletionDialog(() => router.push("/rci"));
  const [title, setTitle] = useState(rci.title ?? "");
  // Titre encore automatique ? Passe à false dès la 1re édition manuelle du champ,
  // et le wizard (Nature) cesse alors de le remplacer. Partagé avec RciWizard.
  const [titleAuto, setTitleAuto] = useState(rci.titleAuto);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFinal = rci.status === "FINAL";

  // Autosave du titre (debounce 800 ms). Ignoré si FINAL. Toute écriture ici vient
  // d'une saisie manuelle → on marque le titre « personnalisé » (titleAuto=false).
  useEffect(() => {
    if (isFinal) return;
    if (title === (rci.title ?? "")) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch(`/api/rci/${rci.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() || null, titleAuto: false }),
        });
        if (res.ok) {
          setSavedAt(new Date());
          router.refresh();
        } else {
          const j = await res.json().catch(() => ({}));
          toast.error(j.error || "Sauvegarde échouée");
        }
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [title, rci.id, rci.title, isFinal, router]);

  return (
    <div className="px-4 lg:px-8 py-4 lg:py-6 max-w-3xl mx-auto">
      {dialog}
      <header className="card p-5 lg:p-6 mb-6">
        <Link
          href="/rci"
          className="text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
        >
          <Icon.ChevronLeft className="w-3 h-3" /> Tous les RCI
        </Link>
        <div className="flex items-start justify-between gap-3 mt-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                  isFinal
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isFinal ? "FINALISÉ" : "BROUILLON"}
              </span>
              {rci.dossierNumber && (
                <span className="text-[11px] font-mono text-slate-500">
                  {rci.dossierNumber}
                </span>
              )}
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              {title || "Sans titre"}
            </h1>
            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
              <span>créé par {rci.authorName}</span>
              <span>
                · modifié {format(new Date(rci.updatedAt), "PPp", { locale: fr })}
              </span>
            </div>
          </div>
          {isAdmin && !isFinal && (
            <button
              type="button"
              onClick={() => requestDelete({ type: "rci", id: rci.id })}
              className="text-xs text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5"
            >
              <Icon.X className="w-4 h-4" /> Supprimer
            </button>
          )}
        </div>
      </header>

      {/* Modules liés — bandeau harmonisé du triangle (mêmes repères que la
          session et le Livret CIL). Le rattachement fin d'une source existante
          + la reprise de données restent dans « Sources terrain » du wizard. */}
      <section className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-blue-900/70">
            Modules liés
          </h2>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <ModuleLinks
              self="rci"
              selfId={rci.id}
              cil={linkedCil}
              session={
                linkedSession ? { ficheSlug: linkedSession.ficheSlug } : null
              }
              // RCI finalisé = lecture seule : on garde « ouvrir » sur les
              // voisins liés, mais plus de « + » qui échouerait en 409.
              readOnly={isFinal}
            />
          </div>
        </div>
      </section>

      <section className="card p-5 lg:p-6 mb-6">
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Titre court{" "}
          <span className="text-[10px] text-slate-400">
            (nature + lieu — ex. « Déraillement V2 PK 543,7 Vernaison »)
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // Édition manuelle → le titre devient prioritaire et figé côté auto.
            setTitleAuto(false);
          }}
          disabled={isFinal}
          placeholder="Sans titre"
          className="input"
        />
        <div className="text-[10px] text-slate-400 mt-1 h-4">
          {saving
            ? "Sauvegarde…"
            : savedAt
              ? `Sauvegardé à ${format(savedAt, "HH:mm:ss")}`
              : "Modifications enregistrées automatiquement."}
        </div>
      </section>

      <RciWizard
        rciId={rci.id}
        initialPayload={rci.payload}
        initialDossierNumber={rci.dossierNumber}
        initialEventAt={rci.eventAt}
        initialTitle={rci.title}
        // Le wizard ne fait suivre la Nature au titre que tant qu'il est auto.
        titleAuto={titleAuto}
        status={rci.status}
        authorName={rci.authorName}
        cilIncident={rci.cilIncident}
        session={rci.session}
      />
    </div>
  );
}
