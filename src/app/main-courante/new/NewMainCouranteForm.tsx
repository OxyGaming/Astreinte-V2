"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle, Info, WifiOff } from "lucide-react";
import type { Fiche } from "@/lib/types";
import { enqueue } from "@/lib/idb-offline";

interface Props {
  fiches: Fiche[];
}

export default function NewMainCouranteForm({ fiches }: Props) {
  const router = useRouter();
  const [nature, setNature] = useState("");
  const [libelle, setLibelle] = useState("");
  const [description, setDescription] = useState("");
  const [solution, setSolution] = useState("");
  const [ficheSlug, setFicheSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // État réseau — initialisé à false (= rendu SSR) pour éviter l'erreur d'hydration.
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const reset = () => {
    setNature("");
    setLibelle("");
    setDescription("");
    setSolution("");
    setFicheSlug("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError("");

    // clientOpId stable : réutilisé pour le POST direct ET un éventuel repli
    // hors ligne, afin que le serveur déduplique si le POST avait abouti.
    const clientOpId = crypto.randomUUID();
    const payload = {
      nature: nature.trim() || undefined,
      libelle: libelle.trim() || undefined,
      description: description.trim(),
      solution: solution.trim() || undefined,
      ficheSlug: ficheSlug || undefined,
    };

    // Met la contribution en file d'attente locale (rejeu au retour réseau).
    const saveOffline = async () => {
      await enqueue({
        kind: "main-courante-create",
        payload,
        clientOpId,
        createdAt: Date.now(),
        attempts: 0,
      });
      setOfflineSaved(true);
      setSuccess(true);
    };

    try {
      if (!navigator.onLine) {
        await saveOffline();
        return;
      }
      const res = await fetch("/api/main-courante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, clientOpId }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue.");
      }
    } catch {
      // Perte de réseau pendant l'envoi → bascule en file d'attente locale.
      try {
        await saveOffline();
      } catch {
        setError("Impossible d'enregistrer la contribution. Réessayez.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className={`border rounded-xl p-6 text-center space-y-3 ${
          offlineSaved ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"
        }`}
      >
        {offlineSaved ? (
          <WifiOff size={32} className="mx-auto text-amber-500" />
        ) : (
          <CheckCircle size={32} className="mx-auto text-green-500" />
        )}
        <h2 className={`font-semibold ${offlineSaved ? "text-amber-800" : "text-green-800"}`}>
          {offlineSaved ? "Contribution enregistrée hors ligne" : "Contribution envoyée !"}
        </h2>
        <p className={`text-sm ${offlineSaved ? "text-amber-700" : "text-green-700"}`}>
          {offlineSaved
            ? "Votre contribution est enregistrée sur cet appareil. Elle sera transmise automatiquement aux administrateurs dès le retour de la connexion."
            : "Votre contribution a été transmise aux administrateurs pour validation. Le titre, les avis sécurité et production seront ajoutés par eux avant publication."}
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => { setSuccess(false); setOfflineSaved(false); reset(); }}
            className="text-sm text-blue-700 font-medium hover:underline"
          >
            Nouvelle contribution
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => router.push("/main-courante/mes-soumissions")}
            className="text-sm text-blue-700 font-medium hover:underline"
          >
            Mes soumissions →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info workflow */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-xs text-blue-800">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <p>
          Décrivez la <strong>situation</strong> rencontrée et la <strong>solution</strong> apportée.
          Un administrateur ajoutera ensuite le titre et, si nécessaire, les avis sécurité et production avant publication.
        </p>
      </div>

      {/* Bandeau hors ligne */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800">
          <WifiOff size={14} className="mt-0.5 flex-shrink-0" />
          <p>
            Vous êtes hors ligne. Votre contribution sera enregistrée sur cet appareil
            et envoyée automatiquement au retour de la connexion.
          </p>
        </div>
      )}

      {/* Nature + Libellé (sur une ligne sur desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nature <span className="text-slate-400 font-normal">(code)</span>
          </label>
          <input
            type="text"
            value={nature}
            onChange={(e) => setNature(e.target.value)}
            maxLength={50}
            placeholder="S1, S9, RH…"
            className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition uppercase"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Libellé <span className="text-slate-400 font-normal">(catégorie)</span>
          </label>
          <input
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            maxLength={200}
            placeholder="Ex : Signaux, Travaux sur les voies…"
            className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>
      </div>

      {/* Description (situation) */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Description <span className="text-red-500">*</span>
          <span className="text-xs text-slate-400 font-normal ml-2">(situation rencontrée)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          maxLength={5000}
          placeholder="Décrivez le cas rencontré : qui a appelé, ce qu'il s'est passé, le contexte…"
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">{description.length}/5000 caractères</p>
      </div>

      {/* Solution */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Solution <span className="text-slate-400 font-normal">(ce qui a été fait)</span>
        </label>
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder="Quelle solution a été apportée ? Quelle procédure / consigne / article appliqué ?"
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
        />
        <p className="text-xs text-slate-400 mt-1">{solution.length}/5000 caractères</p>
      </div>

      {/* Fiche liée (optionnel) */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Fiche réflexe associée <span className="text-slate-400 font-normal">(optionnel)</span>
        </label>
        <select
          value={ficheSlug}
          onChange={(e) => setFicheSlug(e.target.value)}
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="">— Aucune fiche associée —</option>
          {fiches.map((f) => (
            <option key={f.slug} value={f.slug}>
              {f.numero.toString().padStart(2, "0")} — {f.titre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !description.trim()}
        className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        <Send size={14} />
        {submitting
          ? "Envoi en cours…"
          : isOffline
          ? "Enregistrer hors ligne"
          : "Soumettre ma contribution"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Votre contribution sera relue et éventuellement éditée par un administrateur avant publication.
      </p>
    </form>
  );
}
