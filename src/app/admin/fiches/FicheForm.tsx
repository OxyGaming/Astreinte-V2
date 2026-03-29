"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, Info } from "lucide-react";

interface Contact { id: string; nom: string; categorie: string }
interface Secteur { id: string; nom: string; ligne: string }

interface Fiche {
  id?: string;
  slug?: string;
  numero?: number;
  titre?: string;
  categorie?: string;
  priorite?: string;
  mnemonique?: string | null;
  resume?: string;
  etapes?: string;
  references?: string | null;
  avisObligatoires?: string | null;
  featured?: boolean;
  contacts?: { contactId: string; contact: Contact }[];
  secteurs?: { secteurId: string; secteur: Secteur }[];
}

interface Props {
  fiche?: Fiche;
  contacts: Contact[];
  secteurs: Secteur[];
  mode: "create" | "edit";
}

export default function FicheForm({ fiche, contacts, secteurs, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    slug: fiche?.slug || "",
    numero: fiche?.numero?.toString() || "",
    titre: fiche?.titre || "",
    categorie: fiche?.categorie || "incident",
    priorite: fiche?.priorite || "urgente",
    mnemonique: fiche?.mnemonique || "",
    resume: fiche?.resume || "",
    etapes: fiche?.etapes ? (typeof fiche.etapes === "string" ? fiche.etapes : JSON.stringify(fiche.etapes, null, 2)) : "[]",
    references: fiche?.references ? (typeof fiche.references === "string" ? JSON.parse(fiche.references).join("\n") : "") : "",
    avisObligatoires: fiche?.avisObligatoires ? (typeof fiche.avisObligatoires === "string" ? JSON.parse(fiche.avisObligatoires).join("\n") : "") : "",
    featured: fiche?.featured ?? false,
    contactIds: (fiche?.contacts || []).map((c) => c.contactId),
    secteurIds: (fiche?.secteurs || []).map((s) => s.secteurId),
  });

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleContact(id: string) {
    setForm((prev) => ({
      ...prev,
      contactIds: prev.contactIds.includes(id)
        ? prev.contactIds.filter((c) => c !== id)
        : [...prev.contactIds, id],
    }));
  }

  function toggleSecteur(id: string) {
    setForm((prev) => ({
      ...prev,
      secteurIds: prev.secteurIds.includes(id)
        ? prev.secteurIds.filter((s) => s !== id)
        : [...prev.secteurIds, id],
    }));
  }

  // Valide le JSON des étapes
  function validateEtapes(): boolean {
    try { JSON.parse(form.etapes); return true; }
    catch { return false; }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEtapes()) {
      setError("Le JSON des étapes est invalide. Vérifiez la syntaxe.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const referencesArr = form.references.trim() ? form.references.split("\n").map((r: string) => r.trim()).filter(Boolean) : [];
      const avisArr = form.avisObligatoires.trim() ? form.avisObligatoires.split("\n").map((a: string) => a.trim()).filter(Boolean) : [];

      const url = mode === "create" ? "/api/admin/fiches" : `/api/admin/fiches/${fiche!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          numero: Number(form.numero),
          etapes: form.etapes,
          references: JSON.stringify(referencesArr),
          avisObligatoires: JSON.stringify(avisArr),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      router.push("/admin/fiches");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la fiche "${form.titre}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/fiches/${fiche!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      router.push("/admin/fiches");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Identité */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-base">Identité</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro *</label>
            <input type="number" required min={1} value={form.numero} onChange={(e) => update("numero", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug * (URL)</label>
            <input type="text" required value={form.slug} onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre *</label>
            <input type="text" required value={form.titre} onChange={(e) => update("titre", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
            <select value={form.categorie} onChange={(e) => update("categorie", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="accident">Accident</option>
              <option value="incident">Incident</option>
              <option value="securite">Sécurité</option>
              <option value="gestion-agent">Gestion agent</option>
              <option value="evacuation">Évacuation</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priorité *</label>
            <select value={form.priorite} onChange={(e) => update("priorite", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="urgente">Urgente</option>
              <option value="normale">Normale</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mnémonique associé</label>
            <input type="text" value={form.mnemonique} onChange={(e) => update("mnemonique", e.target.value)}
              placeholder="ex: CAMMI CoCo RR"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Afficher en accueil (fiche courante)</span>
            </label>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Résumé *</label>
            <textarea required value={form.resume} onChange={(e) => update("resume", e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Étapes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-800 text-base">Étapes *</h2>
          <div className="relative group">
            <Info size={14} className="text-gray-400 cursor-help" />
            <div className="absolute left-6 top-0 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 hidden group-hover:block z-10">
              Format JSON : [{"{"}ordre, titre, description, critique?, actions?{"}"}]
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">Format JSON — tableau d&apos;objets {"{"}ordre, titre, description, critique?, actions?{"}"}</p>
        <textarea
          value={form.etapes}
          onChange={(e) => update("etapes", e.target.value)}
          rows={10}
          required
          className={`w-full border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${!validateEtapes() && form.etapes.length > 2 ? "border-red-400 bg-red-50" : "border-gray-300"}`}
        />
        {!validateEtapes() && form.etapes.length > 2 && (
          <p className="text-xs text-red-600">JSON invalide — vérifiez la syntaxe</p>
        )}
      </div>

      {/* Références et avis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-base">Références et avis</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Références réglementaires</label>
            <p className="text-xs text-gray-400 mb-2">Une par ligne (ex: OP522)</p>
            <textarea value={form.references} onChange={(e) => update("references", e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Avis obligatoires</label>
            <p className="text-xs text-gray-400 mb-2">Un par ligne (ex: COGC)</p>
            <textarea value={form.avisObligatoires} onChange={(e) => update("avisObligatoires", e.target.value)} rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Relations */}
      <div className="grid grid-cols-2 gap-6">
        {/* Contacts liés */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Contacts liés</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.contactIds.includes(c.id)} onChange={() => toggleContact(c.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{c.nom}</p>
                  <p className="text-xs text-gray-400 truncate">{c.categorie}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Secteurs liés */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 text-sm mb-3">Secteurs liés</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {secteurs.map((s) => (
              <label key={s.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.secteurIds.includes(s.id)} onChange={() => toggleSecteur(s.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{s.nom}</p>
                  <p className="text-xs text-gray-400">Ligne {s.ligne}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex gap-3">
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
        {mode === "edit" && (
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm px-4 py-2.5 rounded-lg transition-colors border border-red-200">
            <Trash2 size={15} />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        )}
      </div>
    </form>
  );
}
