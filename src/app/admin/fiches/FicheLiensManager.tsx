"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Save, AlertTriangle, Loader2, Info } from "lucide-react";

interface FicheRow {
  id: string;
  numero: number;
  titre: string;
  slug: string;
}

interface Props {
  ficheId: string;
  ficheTitre: string;
  allFiches: FicheRow[];
  initialCibleIds: string[];
}

export default function FicheLiensManager({ ficheId, ficheTitre, allFiches, initialCibleIds }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCibleIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const initialSet = new Set(initialCibleIds);
  const hasChanges =
    selected.size !== initialSet.size ||
    [...selected].some((id) => !initialSet.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/fiches/${ficheId}/liens`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleIds: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  const filtered = search.trim()
    ? allFiches.filter((f) => {
        const q = search.toLowerCase();
        return (
          f.titre.toLowerCase().includes(q) ||
          f.slug.toLowerCase().includes(q) ||
          String(f.numero).includes(q)
        );
      })
    : allFiches;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800 text-base flex items-center gap-2">
          <Link2 size={18} className="text-blue-600" />
          Fiches liées
        </h2>
        <p className="text-xs text-gray-500 mt-1 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            Sélectionnez les fiches accessibles directement depuis « {ficheTitre} » (ex. bascule vers une fiche
            dégradée). Les liens sont <strong>bidirectionnels</strong> : la fiche cible affichera automatiquement
            celle-ci en retour.
          </span>
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (numéro, titre, slug)…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">Aucune fiche trouvée</p>
        ) : (
          filtered.map((f) => (
            <label
              key={f.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(f.id)}
                onChange={() => toggle(f.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">
                  <span className="text-gray-400 font-mono mr-2">#{f.numero.toString().padStart(2, "0")}</span>
                  {f.titre}
                </p>
                <p className="text-xs text-gray-400 truncate">{f.slug}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-500">
          {selected.size} fiche{selected.size > 1 ? "s" : ""} liée{selected.size > 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Sauvegarde…" : "Enregistrer les liens"}
        </button>
      </div>
    </div>
  );
}
