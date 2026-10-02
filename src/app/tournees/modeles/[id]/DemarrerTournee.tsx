"use client";

import { useState } from "react";
import { User, Users, Loader2 } from "lucide-react";

/**
 * Démarrage d'une réalisation : solo (immédiat, aujourd'hui) ou équipe
 * (le créateur devient référent ; date et heure ajustables).
 */
export default function DemarrerTournee({ modeleId, heureDepart, today }: { modeleId: string; heureDepart: string; today: string }) {
  const [equipe, setEquipe] = useState(false);
  const [date, setDate] = useState(today);
  const [heure, setHeure] = useState(heureDepart);
  const [busy, setBusy] = useState<"SOLO" | "EQUIPE" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function creer(mode: "SOLO" | "EQUIPE") {
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch("/api/tournees/realisations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modeleId,
          mode,
          date: mode === "EQUIPE" ? date : today,
          heureDepart: mode === "EQUIPE" ? heure : heureDepart,
          clientOpId: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impossible de créer la tournée");
      window.location.assign(`/tournees/r/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => creer("SOLO")} disabled={!!busy}
          className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold disabled:opacity-60 transition">
          {busy === "SOLO" ? <Loader2 size={22} className="animate-spin" /> : <User size={22} />}
          Démarrer seul
        </button>
        <button onClick={() => setEquipe((v) => !v)} disabled={!!busy}
          className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl font-semibold border-2 transition active:scale-[0.98] ${
            equipe ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
          }`}>
          <Users size={22} />
          Organiser en équipe
        </button>
      </div>
      {equipe && (
        <div className="card p-4 space-y-3 border-violet-200">
          <p className="text-sm text-slate-600">
            Vous serez <strong>référent</strong> : vous pourrez ajuster le parcours avant le départ, puis partager un lien ou un code.
            Chacun suivra sa propre progression.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-slate-500">
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
            </label>
            <label className="text-xs text-slate-500">
              Départ
              <input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800" />
            </label>
          </div>
          <button onClick={() => creer("EQUIPE")} disabled={!!busy || !date || !heure}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold disabled:opacity-60">
            {busy === "EQUIPE" && <Loader2 size={16} className="animate-spin" />}
            Créer la tournée d&apos;équipe
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
