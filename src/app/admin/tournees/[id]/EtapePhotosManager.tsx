"use client";

import { useRef, useState } from "react";
import { X, Upload, Trash2, ChevronLeft, ChevronRight, Loader2, ImageIcon } from "lucide-react";
import { photoUrl, resizeImage } from "@/lib/tournee/image-client";
import { inputCls, type EditorPhoto } from "./editor-types";
import { useConfirmDialog } from "@/components/ConfirmDialog";

interface Props {
  etapeId: string;
  etapeTitre: string;
  photos: EditorPhoto[];
  onChange: (photos: EditorPhoto[]) => void;
  onClose: () => void;
}

/**
 * Photos ILLUSTRATIVES d'une étape de modèle (vue d'un point, guérite,
 * levier…) — permanentes, visibles par tous les participants. Ce ne sont pas
 * des relevés terrain (ceux-ci passent par les contributions).
 * Les opérations sont immédiates (pas de bouton « Sauvegarder »).
 */
export default function EtapePhotosManager({ etapeId, etapeTitre, photos, onChange, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dialog, ask } = useConfirmDialog();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let current = photos;
    try {
      for (const f of Array.from(files)) {
        const resized = await resizeImage(f);
        const fd = new FormData();
        fd.append("file", resized);
        const res = await fetch(`/api/admin/tournees/etapes/${etapeId}/photos`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Échec de l'envoi");
        current = [...current, { id: data.id, caption: data.caption ?? null }];
        onChange(current);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Échec de la mise à jour");
  }

  async function remove(id: string) {
    if (!(await ask({ title: "Supprimer cette photo ?", description: "La photo sera supprimée définitivement.", confirmLabel: "Supprimer", tone: "danger" }))) return;
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (!res.ok) return setError("Échec de la suppression");
    onChange(photos.filter((p) => p.id !== id));
  }

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    try {
      await Promise.all(next.map((p, k) => patch(p.id, { ordre: k })));
    } catch {
      setError("Ordre non enregistré");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {dialog}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Photos illustratives</h2>
            <p className="text-xs text-gray-400">{etapeTitre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {busy ? "Envoi…" : "Ajouter des photos"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <p className="text-xs text-gray-400">Redimensionnées automatiquement (JPEG, 1600 px max).</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {photos.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <ImageIcon size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune photo pour cette étape.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {photos.map((p, i) => (
                <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl(p.id)} alt={p.caption ?? ""} className="w-full h-44 object-cover bg-gray-100" />
                  <div className="p-2 space-y-2">
                    <input
                      className={inputCls}
                      placeholder="Légende (optionnel)"
                      defaultValue={p.caption ?? ""}
                      onBlur={async (e) => {
                        const caption = e.target.value.trim() || null;
                        if (caption === p.caption) return;
                        try {
                          await patch(p.id, { caption });
                          onChange(photos.map((x) => (x.id === p.id ? { ...x, caption } : x)));
                        } catch {
                          setError("Légende non enregistrée");
                        }
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
                        <button onClick={() => move(i, 1)} disabled={i === photos.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
                      </div>
                      <button onClick={() => remove(p.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
