"use client";

import { useRef, useState } from "react";
import { X, Camera, Loader2, Send, CheckCircle2, Trash2 } from "lucide-react";
import { resizeImage } from "@/lib/tournee/image-client";
import { CONTRIBUTION_TYPES, CONTRIBUTION_TYPE_LABELS, MAX_PHOTOS_CONTRIBUTION, type ContributionType } from "@/lib/tournee/contributions";
import type { TourneePlanEtape } from "@/lib/tournee/types";

/**
 * « Contribuer » : remontée terrain (anomalie, remise en conformité…).
 * Distincte des photos illustratives du modèle et de la progression :
 * elle part en traitement administratif, sans modifier le parcours.
 */
export default function ContributionForm({
  realisationId, etape, onClose,
}: { realisationId: string; etape: TourneePlanEtape | null; onClose: () => void }) {
  const [type, setType] = useState<ContributionType>("ANOMALIE");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const opId = useRef(crypto.randomUUID());

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setError(null);
    try {
      const next = [...photos];
      for (const f of Array.from(files).slice(0, MAX_PHOTOS_CONTRIBUTION - photos.length)) {
        const r = await resizeImage(f);
        next.push({ file: r, url: URL.createObjectURL(r) });
      }
      setPhotos(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo illisible");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    if (!description.trim() && photos.length === 0) return setError("Décrivez la contribution ou ajoutez une photo.");
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("type", type);
    fd.append("description", description);
    fd.append("realisationId", realisationId);
    if (etape) fd.append("etapeKey", etape.key);
    fd.append("clientOpId", opId.current);
    photos.forEach((p) => fd.append("photos", p.file));
    try {
      const res = await fetch("/api/tournees/contributions", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible");
      setDone(true);
    } catch (e) {
      setError(e instanceof TypeError ? "Pas de réseau — réessayez dès que possible (votre saisie est conservée)." : e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onClose} />
      <div className="relative bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Contribuer</h3>
            <p className="text-xs text-slate-500">{etape ? `Étape : ${etape.titre}` : "Contribution générale sur la tournée"}</p>
          </div>
          <button onClick={onClose} disabled={busy} className="p-2 -mr-2 text-slate-400"><X size={20} /></button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
            <p className="font-bold text-slate-800">Contribution envoyée</p>
            <p className="text-sm text-slate-500">Elle sera analysée par l&apos;administration. Le parcours n&apos;est pas modifié.</p>
            <button onClick={onClose} className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm">Retour à la tournée</button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRIBUTION_TYPES.map((t) => (
                    <button key={t} onClick={() => setType(t)}
                      className={`text-sm px-3 py-2.5 rounded-xl border text-left font-medium ${type === t ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700"}`}>
                      {CONTRIBUTION_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Description</p>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
                  placeholder="ex : Le repérage du levier C n'est plus conforme."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Photos ({photos.length}/{MAX_PHOTOS_CONTRIBUTION})</p>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={p.url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS_CONTRIBUTION && (
                    <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center gap-1 text-xs font-semibold">
                      <Camera size={22} /> Ajouter
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <button onClick={submit} disabled={busy} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
