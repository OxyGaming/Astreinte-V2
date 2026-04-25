"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Trash2 } from "lucide-react";

type Secteur = {
  id: string;
  nom: string;
  ligne: string;
  trajet: string;
  _count: { fiches: number; postes: number };
};

export default function SecteursList({ initialSecteurs }: { initialSecteurs: Secteur[] }) {
  const [secteurs, setSecteurs] = useState(initialSecteurs);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(s: Secteur) {
    const confirmed = window.confirm(
      `Confirmer la suppression du secteur "${s.nom}" ?\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    setDeleting(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/secteurs/${s.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la suppression.");
      } else {
        setSecteurs((prev) => prev.filter((x) => x.id !== s.id));
      }
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table style={{ minWidth: 640 }} className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-gray-600">Nom</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-24">Ligne</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600">Trajet</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-28">Relations</th>
              <th className="w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {secteurs.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{s.nom}</td>
                <td className="px-4 py-4">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-mono">{s.ligne}</span>
                </td>
                <td className="px-4 py-4 text-gray-600 text-xs">{s.trajet}</td>
                <td className="px-4 py-4 text-gray-500 text-xs">
                  {s._count.fiches}f / {s._count.postes}p
                </td>
                <td className="px-4 py-4 flex items-center gap-1">
                  <Link
                    href={`/admin/secteurs/${s.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                    title="Modifier"
                  >
                    <Edit2 size={15} />
                  </Link>
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={deleting === s.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex disabled:opacity-40"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {secteurs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                  Aucun secteur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
