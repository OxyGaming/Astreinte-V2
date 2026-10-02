"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export default function NewModeleForm() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [sousTitre, setSousTitre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return setError("Le titre est obligatoire");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, sousTitre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la création");
      router.push(`/admin/tournees/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Titre <span className="text-red-500">*</span>
        </label>
        <input
          autoFocus
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="ex : Tournée astreinte — secteur Nord"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Sous-titre <span className="text-gray-400 font-normal text-xs">(optionnel, ex. secteur)</span>
        </label>
        <input
          value={sousTitre}
          onChange={(e) => setSousTitre(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={14} />
          {error}
        </p>
      )}
      <p className="text-xs text-gray-400">
        Le modèle est créé en brouillon avec une étape de départ et une restitution ; vous construirez ensuite le parcours.
      </p>
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
      >
        {saving ? "Création…" : "Créer le modèle"}
      </button>
    </form>
  );
}
