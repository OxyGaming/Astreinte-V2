"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle } from "lucide-react";

interface Contact {
  id?: string;
  nom: string;
  role: string;
  categorie: string;
  telephone: string;
  telephoneAlt?: string | null;
  note?: string | null;
  disponibilite?: string | null;
}

interface FicheRef {
  fiche: { id: string; titre: string; slug: string };
}

interface Props {
  contact?: Contact & { fiches?: FicheRef[] };
  mode: "create" | "edit";
}

export default function ContactForm({ contact, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: contact?.nom || "",
    role: contact?.role || "",
    categorie: contact?.categorie || "urgence",
    telephone: contact?.telephone || "",
    telephoneAlt: contact?.telephoneAlt || "",
    note: contact?.note || "",
    disponibilite: contact?.disponibilite || "",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = mode === "create" ? "/api/admin/contacts" : `/api/admin/contacts/${contact!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      router.push("/admin/contacts");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le contact "${form.nom}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      router.push("/admin/contacts");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setDeleting(false);
    }
  }

  const fichesLiees = contact?.fiches || [];

  return (
    <form onSubmit={handleSave} className="max-w-2xl">
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Propagation en cascade */}
      {fichesLiees.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">
            Ce contact est utilisé dans {fichesLiees.length} fiche(s) — la modification sera propagée :
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            {fichesLiees.map((f) => (
              <li key={f.fiche.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
                {f.fiche.titre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
            <input type="text" required value={form.nom} onChange={(e) => update("nom", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle / Fonction *</label>
            <input type="text" required value={form.role} onChange={(e) => update("role", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
            <select value={form.categorie} onChange={(e) => update("categorie", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="urgence">Urgence</option>
              <option value="astreinte">Astreinte</option>
              <option value="encadrement">Encadrement</option>
              <option value="externe">Externe</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Disponibilité</label>
            <input type="text" value={form.disponibilite} onChange={(e) => update("disponibilite", e.target.value)}
              placeholder="ex: 24h/24, Période d'astreinte"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone *</label>
            <input type="tel" required value={form.telephone} onChange={(e) => update("telephone", e.target.value)}
              placeholder="04 XX XX XX XX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone alternatif</label>
            <input type="tel" value={form.telephoneAlt} onChange={(e) => update("telephoneAlt", e.target.value)}
              placeholder="ex: 19"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
            <textarea value={form.note} onChange={(e) => update("note", e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
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
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm px-4 py-2.5 rounded-lg transition-colors border border-red-200 hover:border-red-300">
            <Trash2 size={15} />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        )}
      </div>
    </form>
  );
}
