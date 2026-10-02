"use client";

import { useMemo, useState } from "react";
import {
  Plus, ChevronUp, ChevronDown, Pencil, Trash2, Save, CheckCircle2, AlertTriangle, Camera, Car, EyeOff, Link2, BookOpen,
} from "lucide-react";
import type { Lien } from "@/lib/types";
import { construirePlanTheorique } from "@/lib/tournee/planning";
import { formatHHmm, isValidHHmm, parisYmd } from "@/lib/tournee/time";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import { ETAPE_ICON } from "@/components/tournee/etape-ui";
import TourneeEtapeForm from "./TourneeEtapeForm";
import EtapePhotosManager from "./EtapePhotosManager";
import { toEditor, type EditorEtape } from "./editor-types";
import { useConfirmDialog } from "@/components/ConfirmDialog";

interface Props {
  modeleId: string;
  heureDepart: string;
  initialEtapes: EditorEtape[];
  collection: Lien[];
}

type Modal = { mode: "add" } | { mode: "edit"; index: number } | { mode: "photos"; index: number } | null;

export default function TourneeEtapesEditor({ modeleId, heureDepart, initialEtapes, collection }: Props) {
  const [etapes, setEtapes] = useState<EditorEtape[]>(initialEtapes);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const { dialog, ask } = useConfirmDialog();

  const mutate = (fn: (prev: EditorEtape[]) => EditorEtape[]) => {
    setEtapes(fn);
    setDirty(true);
  };
  const move = (i: number, d: -1 | 1) =>
    mutate((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Aperçu du planning théorique, recalculé à chaque modification.
  const horaires = useMemo(() => {
    const planEtapes: TourneePlanEtape[] = etapes.map((e, i) => ({
      ...e,
      key: e.id ?? `new-${i}`,
      liens: [],
      photos: [],
    }));
    if (!isValidHHmm(heureDepart)) return null;
    const plan = construirePlanTheorique(planEtapes, parisYmd(Date.now()), heureDepart);
    return { plan, keys: planEtapes.map((e) => e.key) };
  }, [etapes, heureDepart]);

  function flash(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tournees/${modeleId}/etapes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      setEtapes(data.etapes.map(toEditor));
      setDirty(false);
      flash("success", `Parcours enregistré — ${data.count} étape(s)`);
    } catch (e) {
      flash("error", e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function remove(i: number) {
    const e = etapes[i];
    const ok = await ask({
      title: `Supprimer « ${e.titre} » ?`,
      description: e.photos.length ? `Ses ${e.photos.length} photo(s) seront aussi supprimées à l'enregistrement du parcours.` : undefined,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (ok) mutate((prev) => prev.filter((_, k) => k !== i));
  }

  const editing = modal && modal.mode !== "add" ? etapes[modal.index] : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {dialog}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 flex-wrap">
        <div>
          <h2 className="font-semibold text-gray-900">Parcours</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {etapes.length} étape(s) · horaires calculés depuis le départ {heureDepart}
            {horaires && ` → fin ${formatHHmm(horaires.plan.fin)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
              <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
          <button onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={14} /> Étape
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mx-4 sm:mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          toast.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      <ol className="p-2 sm:p-4">
        {etapes.map((e, i) => {
          const t = horaires?.plan.byKey.get(horaires.keys[i]);
          const Icon = ETAPE_ICON[e.type];
          const nextObligatoire = etapes.slice(i + 1).some((x) => !x.optionnelle);
          return (
            <li key={e.id ?? `new-${i}`}>
              {t && !e.optionnelle && t.margeAvantMin > 0 && (
                <p className="ml-14 text-[11px] text-emerald-600 py-0.5">⏸ marge {Math.round(t.margeAvantMin)} min (heure imposée)</p>
              )}
              <div className={`flex items-start gap-3 px-2 sm:px-3 py-3 rounded-lg hover:bg-gray-50 group ${e.optionnelle ? "opacity-90" : ""}`}>
                <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-0"><ChevronUp size={15} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === etapes.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-0"><ChevronDown size={15} /></button>
                </div>
                <div className="w-20 flex-shrink-0 text-xs font-semibold text-gray-700 pt-1 tabular-nums">
                  {e.optionnelle ? (
                    <span className="text-amber-600">Optionnel</span>
                  ) : t?.debut != null ? (
                    <>
                      {formatHHmm(t.debut)}
                      {e.dureeMin > 0 && <span className="text-gray-400 font-normal"> – {formatHHmm(t.fin!)}</span>}
                    </>
                  ) : null}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  e.optionnelle ? "bg-amber-50 text-amber-600 border border-dashed border-amber-300" : "bg-blue-50 text-blue-600"
                }`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {e.titre}
                    {e.heureImposee && <span className="ml-2 text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">⏰ {e.heureImposee}</span>}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                    <span>{e.dureeMin} min</span>
                    {e.optionnelle && <span>détour {e.surcoutTrajetMin ?? 0} min</span>}
                    {e.latitude != null ? <span>📍 GPS</span> : <span className="text-amber-500">sans GPS</span>}
                    {e.localisationMasquee && <span className="flex items-center gap-0.5"><EyeOff size={11} /> masquée</span>}
                    {e.contenu.length > 0 && <span className="flex items-center gap-0.5"><BookOpen size={11} /> {e.contenu.length}</span>}
                    {e.liens.length > 0 && <span className="flex items-center gap-0.5"><Link2 size={11} /> {e.liens.length}</span>}
                    {e.photos.length > 0 && <span className="flex items-center gap-0.5"><Camera size={11} /> {e.photos.length}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => (e.id ? setModal({ mode: "photos", index: i }) : flash("error", "Enregistrez le parcours avant d'ajouter des photos à cette étape"))}
                    title="Photos illustratives" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Camera size={15} />
                  </button>
                  <button onClick={() => setModal({ mode: "edit", index: i })} title="Modifier" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(i)} title="Supprimer" className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {!e.optionnelle && nextObligatoire && e.trajetSuivanteMin > 0 && (
                <p className="ml-[7.5rem] text-[11px] text-gray-400 py-0.5 flex items-center gap-1">
                  <Car size={11} /> trajet {e.trajetSuivanteMin} min
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {dirty && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center justify-between rounded-b-xl">
          <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={12} /> Modifications non enregistrées</p>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium px-4 py-1.5 rounded-lg">
            <Save size={12} /> {saving ? "Enregistrement…" : "Enregistrer le parcours"}
          </button>
        </div>
      )}

      {(modal?.mode === "add" || modal?.mode === "edit") && (
        <TourneeEtapeForm
          entry={modal.mode === "edit" ? editing : null}
          collection={collection}
          onClose={() => setModal(null)}
          onSave={(entry) => {
            if (modal.mode === "edit") {
              const idx = modal.index;
              mutate((prev) => prev.map((x, k) => (k === idx ? entry : x)));
            } else {
              // Insertion avant la restitution finale si elle existe.
              mutate((prev) => {
                const last = prev[prev.length - 1];
                return last?.type === "RESTITUTION" && entry.type !== "RESTITUTION"
                  ? [...prev.slice(0, -1), entry, last]
                  : [...prev, entry];
              });
            }
            setModal(null);
          }}
        />
      )}
      {modal?.mode === "photos" && editing?.id && (
        <EtapePhotosManager
          etapeId={editing.id}
          etapeTitre={editing.titre}
          photos={editing.photos}
          onClose={() => setModal(null)}
          onChange={(photos) => {
            const idx = modal.index;
            setEtapes((prev) => prev.map((x, k) => (k === idx ? { ...x, photos } : x)));
          }}
        />
      )}
    </div>
  );
}
