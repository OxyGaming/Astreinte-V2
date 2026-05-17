"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Trash2, Save, ShieldAlert, Wrench } from "lucide-react";
import type { MainCourante, Fiche } from "@/lib/types";

interface Props {
  entry: MainCourante;
  fiches: Fiche[];
}

export default function AdminMainCouranteForm({ entry, fiches }: Props) {
  const router = useRouter();
  const [titre, setTitre] = useState(entry.titre ?? "");
  const [nature, setNature] = useState(entry.nature ?? "");
  const [libelle, setLibelle] = useState(entry.libelle ?? "");
  const [description, setDescription] = useState(entry.description);
  const [solution, setSolution] = useState(entry.solution ?? "");
  const [avisSecurite, setAvisSecurite] = useState(entry.avisSecurite ?? "");
  const [avisProduction, setAvisProduction] = useState(entry.avisProduction ?? "");
  const [ficheSlug, setFicheSlug] = useState(entry.ficheSlug ?? "");
  const [rejetMotif, setRejetMotif] = useState(entry.rejetMotif ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (status?: "validated" | "rejected") => {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string | undefined> = {
        titre,
        nature,
        libelle,
        description,
        solution,
        avisSecurite,
        avisProduction,
        ficheSlug,
      };
      if (status) body.status = status;
      if (status === "rejected") body.rejetMotif = rejetMotif;

      const res = await fetch(`/api/admin/main-courante/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/admin/main-courante");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la mise à jour.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer définitivement cette entrée ?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/main-courante/${entry.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/main-courante");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const canValidate = description.trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Modération & édition
        </p>

        {/* Nature + Libellé */}
        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nature</label>
            <input
              type="text"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              maxLength={50}
              placeholder="Ex : S1"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition uppercase"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Libellé</label>
            <input
              type="text"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              maxLength={200}
              placeholder="Ex : Signaux"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
        </div>

        {/* Titre (admin uniquement) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Titre <span className="text-xs text-slate-400 font-normal ml-2">(résumé court — admin uniquement)</span>
          </label>
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            maxLength={200}
            placeholder="Résumé court de la situation"
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Description <span className="text-red-500">*</span>
            <span className="text-xs text-slate-400 font-normal ml-2">(situation rencontrée)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={5000}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
          />
        </div>

        {/* Solution */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Solution <span className="text-xs text-slate-400 font-normal ml-2">(ce qui a été fait)</span>
          </label>
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            rows={5}
            maxLength={5000}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
          />
        </div>

        {/* Avis sécurité — admin uniquement */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <ShieldAlert size={14} className="text-amber-600" />
            Avis sécurité
            <span className="text-xs text-slate-400 font-normal">(admin uniquement)</span>
          </label>
          <textarea
            value={avisSecurite}
            onChange={(e) => setAvisSecurite(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Commentaire de la filière sécurité…"
            className="w-full px-4 py-3 text-sm bg-amber-50 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 transition resize-none"
          />
        </div>

        {/* Avis production — admin uniquement */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1.5">
            <Wrench size={14} className="text-indigo-600" />
            Avis production
            <span className="text-xs text-slate-400 font-normal">(admin uniquement)</span>
          </label>
          <textarea
            value={avisProduction}
            onChange={(e) => setAvisProduction(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Commentaire de la filière production…"
            className="w-full px-4 py-3 text-sm bg-indigo-50 border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
          />
        </div>

        {/* Fiche liée */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fiche réflexe associée</label>
          <select
            value={ficheSlug}
            onChange={(e) => setFicheSlug(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          >
            <option value="">— Aucune —</option>
            {fiches.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.numero.toString().padStart(2, "0")} — {f.titre}
              </option>
            ))}
          </select>
        </div>

        {/* Motif de rejet */}
        {(entry.status === "rejected" || entry.status === "pending") && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Motif de rejet
              <span className="text-xs text-slate-400 font-normal ml-2">(optionnel, visible de l&apos;auteur)</span>
            </label>
            <input
              type="text"
              value={rejetMotif}
              onChange={(e) => setRejetMotif(e.target.value)}
              placeholder="Ex : Trop générique, doublon avec une entrée existante…"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {entry.status !== "validated" && (
          <button
            onClick={() => submit("validated")}
            disabled={saving || !canValidate}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle size={15} />
            Valider et publier
          </button>
        )}

        {entry.status === "validated" && (
          <button
            onClick={() => submit()}
            disabled={saving || !canValidate}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Save size={15} />
            Enregistrer les modifications
          </button>
        )}

        {entry.status !== "rejected" && (
          <button
            onClick={() => submit("rejected")}
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <XCircle size={15} />
            Rejeter
          </button>
        )}

        {entry.status === "rejected" && (
          <button
            onClick={() => submit("validated")}
            disabled={saving || !canValidate}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle size={15} />
            Valider quand même
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={saving}
          className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ml-auto"
        >
          <Trash2 size={15} />
          Supprimer
        </button>
      </div>
    </div>
  );
}
