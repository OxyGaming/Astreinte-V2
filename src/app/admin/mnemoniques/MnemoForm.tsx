"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, Plus, X } from "lucide-react";

interface Lettre { lettre: string; signification: string; detail?: string }
interface Mnemonique {
  id?: string; acronyme?: string; titre?: string; description?: string;
  lettres?: string; contexte?: string | null; couleur?: string | null;
}

export default function MnemoForm({ mnemonique, mode }: { mnemonique?: Mnemonique; mode: "create" | "edit" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseLettres = (): Lettre[] => {
    if (!mnemonique?.lettres) return [];
    try { return JSON.parse(mnemonique.lettres); } catch { return []; }
  };

  const [form, setForm] = useState({
    acronyme: mnemonique?.acronyme || "",
    titre: mnemonique?.titre || "",
    description: mnemonique?.description || "",
    contexte: mnemonique?.contexte || "",
    couleur: mnemonique?.couleur || "blue",
  });
  const [lettres, setLettres] = useState<Lettre[]>(parseLettres());

  function addLettre() { setLettres((p) => [...p, { lettre: "", signification: "", detail: "" }]); }
  function removeLettre(i: number) { setLettres((p) => p.filter((_, idx) => idx !== i)); }
  function updateLettre(i: number, field: keyof Lettre, value: string) {
    setLettres((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const url = mode === "create" ? "/api/admin/mnemoniques" : `/api/admin/mnemoniques/${mnemonique!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lettres: JSON.stringify(lettres) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur sauvegarde");
      router.push("/admin/mnemoniques");
      router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.acronyme}" ?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/mnemoniques/${mnemonique!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      router.push("/admin/mnemoniques"); router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); setDeleting(false); }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Identité</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Acronyme *</label>
            <input type="text" required value={form.acronyme} onChange={(e) => setForm((p) => ({ ...p, acronyme: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur</label>
            <select value={form.couleur} onChange={(e) => setForm((p) => ({ ...p, couleur: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["blue", "amber", "red", "green", "purple"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
            <input type="text" required value={form.titre} onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea required value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contexte d&apos;usage</label>
            <textarea value={form.contexte} onChange={(e) => setForm((p) => ({ ...p, contexte: e.target.value }))} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Lettres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Lettres ({lettres.length})</h2>
          <button type="button" onClick={addLettre}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
            <Plus size={14} />Ajouter une lettre
          </button>
        </div>
        <div className="space-y-3">
          {lettres.map((l, i) => (
            <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-lg p-3">
              <div className="flex-shrink-0 w-16">
                <label className="block text-xs font-medium text-gray-500 mb-1">Lettre *</label>
                <input type="text" required value={l.lettre} onChange={(e) => updateLettre(i, "lettre", e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Signification *</label>
                <input type="text" required value={l.signification} onChange={(e) => updateLettre(i, "signification", e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Détail</label>
                <input type="text" value={l.detail || ""} onChange={(e) => updateLettre(i, "detail", e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="button" onClick={() => removeLettre(i)}
                className="mt-5 p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pb-4">
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
            <Save size={15} />{saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="text-sm text-gray-600 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
        </div>
        {mode === "edit" && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm px-4 py-2.5 rounded-lg border border-red-200">
            <Trash2 size={15} />{deleting ? "Suppression…" : "Supprimer"}
          </button>
        )}
      </div>
    </form>
  );
}
