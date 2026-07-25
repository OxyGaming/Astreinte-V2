"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/icons";

/**
 * Modale de suppression du triangle Session ↔ RCI ↔ Livret CIL (admin-only).
 *
 * Flux : à l'ouverture, récupère l'aperçu d'impact (`GET /api/triangle/
 * deletion-impact`), affiche distinctement les **liens rompus** (WARNING) et les
 * **données perdues** (DANGER), plus le blocage éventuel (élément probant). À la
 * confirmation, envoie le DELETE avec le `stateToken` de l'aperçu.
 *
 * Gestion de l'obsolescence : sur réponse `STALE_STATE`, la modale **reste
 * ouverte**, recharge l'impact et oblige l'administrateur à reconfirmer. Sur
 * `PROBATIVE_BLOCK`, l'impact est rechargé pour refléter le blocage.
 */

export type TriangleKind = "rci" | "cil" | "session";
export type DeletionTarget = { type: TriangleKind; id: string };

type Impact = {
  resource: { type: TriangleKind; id: string; title: string; status: string };
  severedLinks: {
    neighborType: TriangleKind;
    neighborId: string;
    neighborTitle: string;
    neighborStatus: string;
  }[];
  destroyedData: string[];
  blockers: { reason: string; element: { type: TriangleKind; id: string; title: string } }[];
  severity: "WARNING" | "DANGER";
  deletable: boolean;
  stateToken: string;
};

const KIND_LABEL: Record<TriangleKind, string> = {
  rci: "RCI",
  cil: "Livret CIL",
  session: "Session",
};

function deleteUrl(t: DeletionTarget): string {
  if (t.type === "rci") return `/api/rci/${t.id}`;
  if (t.type === "cil") return `/api/cil/${t.id}`;
  return `/api/sessions/${t.id}`;
}

/**
 * Hook d'orchestration. `onDeleted` est appelé après une suppression réussie
 * (l'appelant retire la ligne de sa liste / rafraîchit).
 */
export function useDeletionDialog(onDeleted?: (target: DeletionTarget) => void) {
  const [target, setTarget] = useState<DeletionTarget | null>(null);
  const requestDelete = useCallback((t: DeletionTarget) => setTarget(t), []);
  const close = useCallback(() => setTarget(null), []);

  const dialog = target ? (
    <DeletionImpactDialog
      target={target}
      onClose={close}
      onDeleted={(t) => {
        onDeleted?.(t);
        close();
      }}
    />
  ) : null;

  return { dialog, requestDelete };
}

function DeletionImpactDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: DeletionTarget;
  onClose: () => void;
  onDeleted: (target: DeletionTarget) => void;
}) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [motif, setMotif] = useState("");
  const [staleNotice, setStaleNotice] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadImpact = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/triangle/deletion-impact?type=${target.type}&id=${target.id}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLoadError(j.error || "Aperçu indisponible");
        setImpact(null);
        return;
      }
      setImpact(await res.json());
    } catch {
      setLoadError("Aperçu indisponible");
      setImpact(null);
    } finally {
      setLoading(false);
    }
  }, [target.type, target.id]);

  useEffect(() => {
    loadImpact();
  }, [loadImpact]);

  // Esc → annulation (sauf pendant la suppression).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, deleting]);

  async function confirmDelete() {
    if (!impact) return;
    setDeleting(true);
    setStaleNotice(false);
    try {
      const res = await fetch(deleteUrl(target), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateToken: impact.stateToken, motif: motif.trim() || null }),
      });
      if (res.ok) {
        toast.success(`${KIND_LABEL[target.type]} supprimé`);
        onDeleted(target);
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (j.code === "STALE_STATE") {
        // L'état a changé : on recharge et on force une reconfirmation.
        setStaleNotice(true);
        toast.message("L'état a changé — vérifiez à nouveau les impacts.");
        await loadImpact();
        return;
      }
      if (j.code === "PROBATIVE_BLOCK") {
        toast.error(j.error || "Suppression bloquée");
        await loadImpact();
        return;
      }
      toast.error(j.error || "Suppression impossible");
    } finally {
      setDeleting(false);
    }
  }

  const isDanger = impact?.severity === "DANGER";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 animate-in flex md:items-center md:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deletion-dialog-title"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="mt-auto md:mt-0 w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-lg animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
              <Icon.Trash className="w-4 h-4 text-rose-600" />
            </div>
            <div className="min-w-0">
              <h2 id="deletion-dialog-title" className="text-base md:text-lg font-bold text-slate-900">
                Supprimer {KIND_LABEL[target.type]}
              </h2>
              {impact && (
                <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{impact.resource.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                    {impact.resource.status}
                  </span>
                </p>
              )}
            </div>
          </div>

          {loading && (
            <p className="text-sm text-slate-500 mt-5">Analyse des impacts…</p>
          )}

          {loadError && !loading && (
            <p className="text-sm text-rose-600 mt-5">{loadError}</p>
          )}

          {impact && !loading && (
            <div className="mt-5 space-y-3">
              {staleNotice && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  L&apos;état a changé depuis le dernier affichage. Les impacts ont été
                  rechargés — vérifiez puis confirmez à nouveau.
                </div>
              )}

              {/* Blocage — élément probant */}
              {!impact.deletable && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700 flex items-center gap-1.5">
                    <Icon.AlertTriangle className="w-3.5 h-3.5" /> Suppression impossible
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {impact.blockers.map((b, i) => (
                      <li key={i} className="text-sm text-rose-800">
                        {b.reason === "SELF_FINAL" && "Ce RCI est finalisé (lecture seule)."}
                        {b.reason === "SELF_CLOSED" && "Ce Livret est clôturé (lecture seule)."}
                        {b.reason === "RCI_FINAL" && (
                          <>Le RCI finalisé « {b.element.title} » y est rattaché et ne peut être altéré.</>
                        )}
                        {b.reason === "CIL_CLOSED" && (
                          <>Le Livret clôturé « {b.element.title} » y est rattaché et ne peut être altéré.</>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* WARNING — liens rompus */}
              {impact.severedLinks.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Liens qui seront rompus
                  </p>
                  <p className="text-[11px] text-amber-700/80 mb-1.5">
                    Ces éléments ne seront pas supprimés, mais détachés.
                  </p>
                  <ul className="space-y-1">
                    {impact.severedLinks.map((l) => (
                      <li key={`${l.neighborType}-${l.neighborId}`} className="text-sm text-amber-900 flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {KIND_LABEL[l.neighborType]}
                        </span>
                        <span className="truncate">{l.neighborTitle}</span>
                        <span className="text-[10px] font-mono text-amber-600/80 uppercase">{l.neighborStatus}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* DANGER — données définitivement supprimées */}
              {impact.destroyedData.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                    Données supprimées définitivement
                  </p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {impact.destroyedData.map((d) => (
                      <li key={d} className="text-xs font-medium px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {impact.deletable &&
                impact.severedLinks.length === 0 &&
                impact.destroyedData.length === 0 && (
                  <p className="text-sm text-slate-600">
                    Aucun lien ni donnée en cascade. Cette suppression est isolée.
                  </p>
                )}

              {/* Motif facultatif */}
              {impact.deletable && (
                <div>
                  <label className="text-xs font-semibold text-slate-600" htmlFor="deletion-motif">
                    Motif (facultatif — conservé dans l&apos;audit)
                  </label>
                  <textarea
                    id="deletion-motif"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    rows={2}
                    className="mt-1 w-full text-sm rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
                    placeholder="Ex. doublon, saisie de test…"
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse md:flex-row md:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 md:border-0 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={loading || deleting || !impact?.deletable}
              className={`px-4 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${
                isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-rose-500 hover:bg-rose-600"
              }`}
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
