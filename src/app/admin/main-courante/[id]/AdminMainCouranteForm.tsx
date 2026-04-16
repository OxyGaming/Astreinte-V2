"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Trash2, Save } from "lucide-react";
import type { MainCourante } from "@/lib/types";

interface Props {
  entry: MainCourante;
}

export default function AdminMainCouranteForm({ entry }: Props) {
  const router = useRouter();
  const [titre, setTitre] = useState(entry.titre);
  const [editedDescription, setEditedDescription] = useState(
    entry.editedDescription ?? entry.description
  );
  const [rejetMotif, setRejetMotif] = useState(entry.rejetMotif ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (status?: "validated" | "rejected") => {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string> = {
        titre: titre.trim(),
        editedDescription: editedDescription.trim(),
      };
      if (status) body.status = status;
      if (status === "rejected") body.rejetMotif = rejetMotif.trim();

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

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
          Modération
        </p>

        {/* Titre éditable */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titre</label>
          <input
            type="text"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            maxLength={200}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        {/* Description éditée */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Description publiée
            <span className="text-xs text-slate-400 font-normal ml-2">
              (version qui sera visible de tous)
            </span>
          </label>
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
          />
        </div>

        {/* Motif de rejet (affiché si on veut rejeter ou si déjà rejeté) */}
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
            disabled={saving || !titre.trim() || !editedDescription.trim()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <CheckCircle size={15} />
            Valider et publier
          </button>
        )}

        {entry.status === "validated" && (
          <button
            onClick={() => submit()}
            disabled={saving}
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
            disabled={saving || !titre.trim() || !editedDescription.trim()}
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
