"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle } from "lucide-react";
import type { Fiche } from "@/lib/types";

interface Props {
  fiches: Fiche[];
}

export default function NewMainCouranteForm({ fiches }: Props) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [ficheSlug, setFicheSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/main-courante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: titre.trim(),
          description: description.trim(),
          ficheSlug: ficheSlug || undefined,
        }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
        <CheckCircle size={32} className="mx-auto text-green-500" />
        <h2 className="font-semibold text-green-800">Contribution envoyée !</h2>
        <p className="text-sm text-green-700">
          Votre contribution a été transmise aux administrateurs pour validation.
          Elle apparaîtra dans la main courante une fois approuvée.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => { setSuccess(false); setTitre(""); setDescription(""); setFicheSlug(""); }}
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
      {/* Titre */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Titre <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          maxLength={200}
          required
          placeholder="Ex : Procédure de reprise après coupure secteur…"
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        <p className="text-xs text-slate-400 mt-1">{titre.length}/200 caractères</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          placeholder="Décrivez le cas rencontré, la bonne pratique ou le point de vigilance…"
          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
        />
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
        disabled={submitting || !titre.trim() || !description.trim()}
        className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        <Send size={14} />
        {submitting ? "Envoi en cours…" : "Soumettre ma contribution"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Votre contribution sera relue et éventuellement éditée par un administrateur avant publication.
      </p>
    </form>
  );
}
