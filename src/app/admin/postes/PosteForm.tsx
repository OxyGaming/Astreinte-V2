"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, AlertTriangle, Info } from "lucide-react";

interface SecteurOption {
  id: string;
  slug: string;
  nom: string;
}

interface PosteRaw {
  id: string;
  slug: string;
  nom: string;
  typePoste: string;
  lignes: string;        // JSON string
  adresse: string;
  horaires: string;
  electrification: string;
  systemeBlock: string;
  annuaire: string;      // JSON string
  circuitsVoie: string;  // JSON string
  pnSensibles: string;   // JSON string
  particularites: string;// JSON string
  proceduresCles: string;// JSON string
  dbc: string | null;    // JSON string
  rex: string | null;    // JSON string
  secteurs?: { secteur: { id: string; slug: string; nom: string } }[];
}

interface Props {
  poste?: PosteRaw;
  secteurs: SecteurOption[];
  mode: "create" | "edit";
}

function isValidJson(s: string) {
  if (!s.trim()) return true; // vide = ok (optionnel)
  try { JSON.parse(s); return true; } catch { return false; }
}

// "annuaire" est intentionnellement absent : géré par PosteAnnuaireEditor
const JSON_FIELDS: { key: keyof PosteRaw; label: string; required: boolean; hint: string; rows: number }[] = [
  // "circuitsVoie" est intentionnellement absent : géré par PosteCircuitsVoieEditor
  // "pnSensibles" est intentionnellement absent : géré par PostePNSensiblesEditor
  // "particularites" est intentionnellement absent : géré par PosteParticularitesEditor
  // "proceduresCles" est intentionnellement absent : géré par PosteProceduresClesEditor
  // "dbc" et "rex" sont intentionnellement absents : gérés par PosteDbcEditor / PosteRexEditor
];

export default function PosteForm({ poste, secteurs, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lignes stockées en JSON string ["750000"] → affichées comme "750000, 800000"
  function lignesFromJson(json: string) {
    try { return (JSON.parse(json) as string[]).join(", "); } catch { return ""; }
  }

  const [form, setForm] = useState({
    slug: poste?.slug || "",
    nom: poste?.nom || "",
    typePoste: poste?.typePoste || "",
    lignes: lignesFromJson(poste?.lignes || "[]"),
    adresse: poste?.adresse || "",
    horaires: poste?.horaires || "",
    electrification: poste?.electrification || "1500V CC",
    systemeBlock: poste?.systemeBlock || "BAL",
    // circuitsVoie géré par PosteCircuitsVoieEditor
    // pnSensibles géré par PostePNSensiblesEditor
    // particularites géré par PosteParticularitesEditor
    // proceduresCles géré par PosteProceduresClesEditor
    // dbc et rex gérés par PosteDbcEditor / PosteRexEditor
  });

  const [secteurIds, setSecteurIds] = useState<string[]>(
    poste?.secteurs?.map((ps) => ps.secteur.id) ?? []
  );

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Valider les champs JSON (annuaire exclu — géré par PosteAnnuaireEditor)
    const jsonFieldsToValidate: { key: string; label: string; required: boolean }[] = [
      // circuitsVoie géré par PosteCircuitsVoieEditor
      // pnSensibles géré par PostePNSensiblesEditor
      // particularites géré par PosteParticularitesEditor
      // proceduresCles géré par PosteProceduresClesEditor
      // dbc et rex gérés par PosteDbcEditor / PosteRexEditor
    ];

    for (const f of jsonFieldsToValidate) {
      const val = form[f.key as keyof typeof form];
      if (f.required && !val.trim()) {
        setError(`Le champ "${f.label}" est obligatoire`);
        return;
      }
      if (val.trim() && !isValidJson(val)) {
        setError(`JSON invalide dans "${f.label}"`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    // Convertir lignes en JSON
    const lignesJson = JSON.stringify(
      form.lignes.split(",").map((s) => s.trim()).filter(Boolean)
    );

    const payload = {
      ...form,
      lignes: lignesJson,
      secteurIds,
    };

    try {
      const url = mode === "create" ? "/api/admin/postes" : `/api/admin/postes/${poste!.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      router.push("/admin/postes");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer le poste "${form.nom}" ? Cette action est irréversible.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/postes/${poste!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      router.push("/admin/postes");
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
        <h2 className="font-semibold text-gray-800">Identité du poste</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
            <input type="text" required value={form.nom} onChange={(e) => update("nom", e.target.value)}
              placeholder="ex: Givors Canal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug *</label>
            <input type="text" required value={form.slug} onChange={(e) => update("slug", e.target.value)}
              placeholder="ex: givors-canal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de poste *</label>
            <input type="text" required value={form.typePoste} onChange={(e) => update("typePoste", e.target.value)}
              placeholder="ex: PRS (Poste Tout Relais à Transit Souple)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lignes *</label>
            <input type="text" required value={form.lignes} onChange={(e) => update("lignes", e.target.value)}
              placeholder="ex: 750000, 800000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Séparer par des virgules</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Secteurs associés</label>
            <div className="border border-gray-300 rounded-lg px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto">
              {secteurs.length === 0 && (
                <p className="text-xs text-gray-400 py-1">Aucun secteur disponible</p>
              )}
              {secteurs.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secteurIds.includes(s.id)}
                    onChange={(e) =>
                      setSecteurIds((prev) =>
                        e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                      )
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{s.nom}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse *</label>
            <input type="text" required value={form.adresse} onChange={(e) => update("adresse", e.target.value)}
              placeholder="ex: Rue Auguste Delaune, 69700 Givors"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horaires *</label>
            <input type="text" required value={form.horaires} onChange={(e) => update("horaires", e.target.value)}
              placeholder="ex: 3×8 : 5h–13h / 13h–21h / 21h–5h"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Électrification *</label>
            <input type="text" required value={form.electrification} onChange={(e) => update("electrification", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Système de block *</label>
            <input type="text" required value={form.systemeBlock} onChange={(e) => update("systemeBlock", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Champs JSON */}
      {JSON_FIELDS.map(({ key, label, hint, rows }) => {
        const val = form[key as keyof typeof form] as string;
        const invalid = val.trim() !== "" && !isValidJson(val);
        return (
          <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800 text-base">{label}</h2>
              <div className="relative group">
                <Info size={14} className="text-gray-400 cursor-help" />
                <div className="absolute left-6 top-0 w-96 bg-gray-800 text-white text-xs rounded-lg p-3 hidden group-hover:block z-10 font-mono break-all whitespace-pre-wrap">
                  {hint}
                </div>
              </div>
            </div>
            <textarea
              value={val}
              onChange={(e) => update(key, e.target.value)}
              rows={rows}
              className={`w-full border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${invalid ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            />
            {invalid && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> JSON invalide
              </p>
            )}
          </div>
        );
      })}

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
            className="flex items-center gap-2 text-red-600 hover:bg-red-50 text-sm px-4 py-2.5 rounded-lg transition-colors border border-red-200 hover:border-red-300">
            <Trash2 size={15} />
            {deleting ? "Suppression…" : "Supprimer"}
          </button>
        )}
      </div>
    </form>
  );
}
