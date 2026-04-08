"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertTriangle, Info } from "lucide-react";

interface FicheRef { fiche: { id: string; titre: string; slug: string } }
interface Secteur {
  id: string; slug: string; nom: string; ligne: string; trajet: string; description: string;
  pointsAcces: string; procedures: string; pn: string | null;
}

interface Props {
  secteur?: Secteur;
  fichesLiees?: FicheRef[];
  mode: "create" | "edit";
}

export default function SecteurForm({ secteur, fichesLiees = [], mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: secteur?.slug || "",
    nom: secteur?.nom || "",
    ligne: secteur?.ligne || "",
    trajet: secteur?.trajet || "",
    description: secteur?.description || "",
    // pointsAcces géré par SecteurPointsAccesEditor
    // procedures géré par SecteurProceduresEditor
    // pn géré par SecteurPNEditor
  });

  function update(field: string, value: string) { setForm((p) => ({ ...p, [field]: value })); }

  function isValidJson(s: string) { try { JSON.parse(s); return true; } catch { return false; } }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // pointsAcces, procedures, pn gérés par leurs éditeurs dédiés
    setSaving(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/admin/secteurs" : `/api/admin/secteurs/${secteur!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur sauvegarde");
      router.push("/admin/secteurs");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}

      {fichesLiees.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">Fiches qui référencent ce secteur :</p>
          <ul className="text-sm text-blue-700 space-y-1">
            {fichesLiees.map((f) => (
              <li key={f.fiche.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />{f.fiche.titre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Identité</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug *</label>
            <input type="text" required value={form.slug} onChange={(e) => update("slug", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ligne *</label>
            <input type="text" required value={form.ligne} onChange={(e) => update("ligne", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
            <input type="text" required value={form.nom} onChange={(e) => update("nom", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trajet *</label>
            <input type="text" required value={form.trajet} onChange={(e) => update("trajet", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea required value={form.description} onChange={(e) => update("description", e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>

      {/* pointsAcces, procedures, pn gérés par leurs éditeurs dédiés */}
      {([] as { key: string; label: string; hint: string }[]).map(({ key, label, hint }) => (
        <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800 text-base">{label}</h2>
            <div className="relative group">
              <Info size={14} className="text-gray-400 cursor-help" />
              <div className="absolute left-6 top-0 w-80 bg-gray-800 text-white text-xs rounded-lg p-3 hidden group-hover:block z-10 font-mono break-all">{hint}</div>
            </div>
          </div>
          <textarea
            value={form[key as keyof typeof form]}
            onChange={(e) => update(key, e.target.value)}
            rows={6}
            className={`w-full border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${form[key as keyof typeof form] && !isValidJson(form[key as keyof typeof form]) ? "border-red-400 bg-red-50" : "border-gray-300"}`}
          />
        </div>
      ))}

      <div className="flex gap-3 pb-4">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          <Save size={15} />
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Annuler
        </button>
      </div>
    </form>
  );
}
