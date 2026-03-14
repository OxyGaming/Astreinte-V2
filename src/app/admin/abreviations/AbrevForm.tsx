"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle } from "lucide-react";

interface Abreviation { id?: string; sigle?: string; definition?: string }

export default function AbrevForm({ abreviation, mode }: { abreviation?: Abreviation; mode: "create" | "edit" }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ sigle: abreviation?.sigle || "", definition: abreviation?.definition || "" });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const url = mode === "create" ? "/api/admin/abreviations" : `/api/admin/abreviations/${abreviation!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur sauvegarde");
      router.push("/admin/abreviations"); router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${form.sigle}" ?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/abreviations/${abreviation!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      router.push("/admin/abreviations"); router.refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); setDeleting(false); }
  }

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Sigle *</label>
          <input type="text" required value={form.sigle} onChange={(e) => setForm((p) => ({ ...p, sigle: e.target.value.toUpperCase() }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Définition *</label>
          <input type="text" required value={form.definition} onChange={(e) => setForm((p) => ({ ...p, definition: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
