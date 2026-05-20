"use client";

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Link2, PenLine } from "lucide-react";
import { isValidHttpUrl } from "@/lib/liens";
import type { Lien, LienRef } from "@/lib/types";

interface Props {
  entry: LienRef | null;
  collection: Lien[];
  onSave: (ref: LienRef) => void;
  onClose: () => void;
}

type Mode = "collection" | "libre";

export default function LienForm({ entry, collection, onSave, onClose }: Props) {
  const editingFree = entry != null && !entry.lienId;
  const [mode, setMode] = useState<Mode>(
    editingFree || collection.length === 0 ? "libre" : "collection"
  );
  const [lienId, setLienId] = useState(entry?.lienId ?? collection[0]?.id ?? "");
  const [labelOverride, setLabelOverride] = useState(entry?.lienId ? entry.libelle ?? "" : "");
  const [libelle, setLibelle] = useState(!entry?.lienId ? entry?.libelle ?? "" : "");
  const [url, setUrl] = useState(entry?.url ?? "");
  const [error, setError] = useState<string | null>(null);

  const selectRef = useRef<HTMLSelectElement>(null);
  const libelleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mode === "collection") selectRef.current?.focus();
    else libelleRef.current?.focus();
  }, [mode]);

  const selectedLien = collection.find((l) => l.id === lienId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "collection") {
      if (!lienId) { setError("Sélectionnez un lien dans la collection"); return; }
      const ref: LienRef = { lienId };
      if (labelOverride.trim()) ref.libelle = labelOverride.trim();
      onSave(ref);
    } else {
      const l = libelle.trim();
      const u = url.trim();
      if (!l) { setError("Le libellé est obligatoire"); return; }
      if (!isValidHttpUrl(u)) { setError("URL invalide — elle doit commencer par http:// ou https://"); return; }
      onSave({ libelle: l, url: u });
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
      active ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier le lien" : "Ajouter un lien"}
          </h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button type="button" onClick={() => { setMode("collection"); setError(null); }}
              className={tabClass(mode === "collection")}>
              <Link2 size={14} /> Depuis la collection
            </button>
            <button type="button" onClick={() => { setMode("libre"); setError(null); }}
              className={tabClass(mode === "libre")}>
              <PenLine size={14} /> Lien libre
            </button>
          </div>

          {mode === "collection" ? (
            collection.length === 0 ? (
              <div className="text-center py-6 px-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                <Link2 size={22} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">La collection de liens est vide.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Créez des liens dans « Liens utiles » (menu admin), ou utilisez l&apos;onglet « Lien libre ».
                </p>
              </div>
            ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lien de la collection <span className="text-red-500">*</span>
                </label>
                <select ref={selectRef} value={lienId} onChange={(e) => setLienId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {collection.map((l) => (
                    <option key={l.id} value={l.id}>{l.libelle}</option>
                  ))}
                </select>
                {selectedLien && (
                  <p className="text-xs text-gray-400 mt-1 truncate font-mono">{selectedLien.url}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Mise à jour de l&apos;URL centralisée : modifier le lien dans la collection le met à jour partout.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Libellé d&apos;affichage <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input type="text" value={labelOverride} onChange={(e) => setLabelOverride(e.target.value)}
                  placeholder={selectedLien?.libelle ?? "Libellé par défaut du lien"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
            )
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Libellé <span className="text-red-500">*</span>
                </label>
                <input ref={libelleRef} type="text" value={libelle} onChange={(e) => setLibelle(e.target.value)}
                  placeholder="ex : Note de service DT-2026"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  URL <span className="text-red-500">*</span>
                </label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              {entry ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
