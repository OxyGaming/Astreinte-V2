"use client";

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Save, Loader2, Settings2 } from "lucide-react";
import { construirePlanTheorique } from "@/lib/tournee/planning";
import { formatHHmm, isValidHHmm, isValidYmd } from "@/lib/tournee/time";
import type { TourneePlanEtape } from "@/lib/tournee/types";
import type { RealisationView } from "@/lib/tournee/realisation";

type Ligne = Pick<TourneePlanEtape, "titre" | "optionnelle" | "dureeMin" | "trajetSuivanteMin" | "surcoutTrajetMin" | "heureImposee" | "type"> & {
  key?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const champ = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm tabular-nums";

/**
 * Ajustement du parcours par le référent AVANT le lancement. Modifie la copie
 * de la réalisation uniquement — jamais le modèle.
 */
export default function PreparationPanel({ view, onSaved }: { view: RealisationView; onSaved: (v: RealisationView) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(view.date);
  const [heure, setHeure] = useState(view.heureDepart);
  const [lignes, setLignes] = useState<Ligne[]>(() => view.plan.etapes.map((e) => ({ ...e })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apercu = useMemo(() => {
    if (!isValidYmd(date) || !isValidHHmm(heure)) return null;
    const etapes = lignes.map((l, i) => ({ ...l, key: l.key ?? `n${i}`, localisationMasquee: false, liens: [], contenu: [], photos: [] })) as TourneePlanEtape[];
    try {
      return { plan: construirePlanTheorique(etapes, date, heure), etapes };
    } catch {
      return null;
    }
  }, [lignes, date, heure]);

  const upd = (i: number, patch: Partial<Ligne>) => setLignes((p) => p.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const move = (i: number, d: -1 | 1) =>
    setLignes((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournees/realisations/${view.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ajuster", date, heureDepart: heure, etapes: lignes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible");
      onSaved(data);
      setLignes(data.plan.etapes.map((e: TourneePlanEtape) => ({ ...e })));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full card p-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        <Settings2 size={16} /> Ajuster le parcours avant le départ
      </button>
    );
  }

  return (
    <div className="card p-4 space-y-4 ring-2 ring-violet-200">
      <div>
        <p className="font-bold text-slate-800">Ajuster le parcours</p>
        <p className="text-xs text-slate-500">Ces changements ne concernent que cette tournée ; le modèle n&apos;est pas modifié.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-500">Date<input type="date" className={champ} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="text-xs text-slate-500">Départ<input type="time" className={champ} value={heure} onChange={(e) => setHeure(e.target.value)} /></label>
      </div>
      <ol className="space-y-2">
        {lignes.map((l, i) => {
          const t = apercu?.plan.byKey.get(apercu.etapes[i].key);
          return (
            <li key={l.key ?? `n${i}`} className={`rounded-xl border p-2.5 ${l.optionnelle ? "border-dashed border-amber-300 bg-amber-50/40" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <span className="w-12 text-[11px] font-bold tabular-nums text-slate-500">{l.optionnelle ? "opt." : t?.debut ? formatHHmm(t.debut) : ""}</span>
                <input className={`${champ} font-semibold`} value={l.titre} onChange={(e) => upd(i, { titre: e.target.value })} />
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} className="text-slate-400"><ChevronUp size={14} /></button>
                  <button onClick={() => move(i, 1)} className="text-slate-400"><ChevronDown size={14} /></button>
                </div>
                <button onClick={() => setLignes((p) => p.filter((_, k) => k !== i))} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] text-slate-500">
                <label>Présence (min)<input type="number" min={0} className={champ} value={l.dureeMin} onChange={(e) => upd(i, { dureeMin: Number(e.target.value) || 0 })} /></label>
                {l.optionnelle ? (
                  <label>Détour (min)<input type="number" min={0} className={champ} value={l.surcoutTrajetMin ?? 0} onChange={(e) => upd(i, { surcoutTrajetMin: Number(e.target.value) || 0 })} /></label>
                ) : (
                  <label>Trajet suiv. (min)<input type="number" min={0} className={champ} value={l.trajetSuivanteMin} onChange={(e) => upd(i, { trajetSuivanteMin: Number(e.target.value) || 0 })} /></label>
                )}
                <label className="flex flex-col justify-end">
                  <span className="flex items-center gap-1.5 py-1.5">
                    <input type="checkbox" checked={l.optionnelle} onChange={(e) => upd(i, { optionnelle: e.target.checked })} /> Optionnelle
                  </span>
                </label>
              </div>
            </li>
          );
        })}
      </ol>
      <button onClick={() => setLignes((p) => {
        const last = p[p.length - 1];
        const n: Ligne = { titre: "Nouvelle étape", type: "POINT", optionnelle: false, dureeMin: 10, trajetSuivanteMin: 10, surcoutTrajetMin: null, heureImposee: null };
        return last?.type === "RESTITUTION" ? [...p.slice(0, -1), n, last] : [...p, n];
      })} className="flex items-center gap-1.5 text-sm font-semibold text-violet-700">
        <Plus size={14} /> Ajouter une étape
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">Fermer</button>
        <button onClick={save} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
        </button>
      </div>
    </div>
  );
}
