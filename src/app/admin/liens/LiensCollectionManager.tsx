"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, ExternalLink, AlertTriangle, X, Link2, Loader2,
} from "lucide-react";
import { isValidHttpUrl } from "@/lib/liens";
import { getLienIcon, getLienColor } from "@/lib/lien-ui";
import type { Lien, LienCategorie } from "@/lib/types";

interface Props {
  initialLiens: Lien[];
  categories: LienCategorie[];
}

type ModalState = { mode: "add" } | { mode: "edit"; lien: Lien } | null;

interface Groupe {
  key: string;
  nom: string;
  couleur: string;
  icon: string;
  liens: Lien[];
}

export default function LiensCollectionManager({ initialLiens, categories }: Props) {
  const router = useRouter();
  const [liens, setLiens] = useState<Lien[]>(initialLiens);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSaved(saved: Lien, mode: "add" | "edit") {
    setLiens((prev) => (mode === "edit" ? prev.map((l) => (l.id === saved.id ? saved : l)) : [...prev, saved]));
    setModal(null);
    router.refresh();
  }

  async function handleDelete(lien: Lien) {
    if (!confirm(`Supprimer « ${lien.libelle} » de la collection ? Les rattachements existants deviendront orphelins.`)) return;
    setDeletingId(lien.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/liens/${lien.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      setLiens((prev) => prev.filter((l) => l.id !== lien.id));
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDeletingId(null);
    }
  }

  // Regroupement par thématique (ordre des catégories) + « Sans thématique ».
  const sort = (list: Lien[]) => [...list].sort((a, b) => a.libelle.localeCompare(b.libelle));
  const catIds = new Set(categories.map((c) => c.id));
  const groupes: Groupe[] = [];
  for (const cat of categories) {
    const catLiens = sort(liens.filter((l) => l.categorieId === cat.id));
    if (catLiens.length) groupes.push({ key: cat.id, nom: cat.nom, couleur: cat.couleur, icon: cat.icon, liens: catLiens });
  }
  const sansCat = sort(liens.filter((l) => !l.categorieId || !catIds.has(l.categorieId)));
  if (sansCat.length) {
    groupes.push({ key: "__none__", nom: "Sans thématique", couleur: "slate", icon: "Link2", liens: sansCat });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Liens</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {liens.length} lien{liens.length !== 1 ? "s" : ""} dans la collection
          </p>
        </div>
        <button onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      <div className="p-4">
        {liens.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Link2 size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun lien dans la collection.</p>
            <p className="text-xs mt-1">Cliquez sur « Ajouter » pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupes.map((g) => {
              const color = getLienColor(g.couleur);
              const GroupIcon = getLienIcon(g.icon);
              return (
                <div key={g.key}>
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${color.head}`}>
                      <GroupIcon size={13} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{g.nom}</span>
                    <span className="text-xs text-gray-400">· {g.liens.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    {g.liens.map((lien) => (
                      <div key={lien.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.tile}`}>
                          <Link2 size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{lien.libelle}</p>
                          <p className="text-xs text-gray-400 truncate">{lien.url}</p>
                        </div>
                        <a href={lien.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md hover:bg-blue-50 flex-shrink-0">
                          <ExternalLink size={13} />
                          Ouvrir
                        </a>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setModal({ mode: "edit", lien })} title="Modifier"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(lien)} disabled={deletingId === lien.id} title="Supprimer"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            {deletingId === lien.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <LienCollectionFormModal
          lien={modal.mode === "edit" ? modal.lien : null}
          categories={categories}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function LienCollectionFormModal({ lien, categories, onSaved, onClose }: {
  lien: Lien | null;
  categories: LienCategorie[];
  onSaved: (lien: Lien, mode: "add" | "edit") => void;
  onClose: () => void;
}) {
  const libelleRef = useRef<HTMLInputElement>(null);
  const [libelle, setLibelle] = useState(lien?.libelle ?? "");
  const [url, setUrl] = useState(lien?.url ?? "");
  const [categorieId, setCategorieId] = useState(lien?.categorieId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { libelleRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const l = libelle.trim();
    const u = url.trim();
    if (!l) { setError("Le libellé est obligatoire"); return; }
    if (!isValidHttpUrl(u)) { setError("URL invalide — elle doit commencer par http:// ou https://"); return; }

    setSaving(true);
    setError(null);
    try {
      const endpoint = lien ? `/api/admin/liens/${lien.id}` : "/api/admin/liens";
      const res = await fetch(endpoint, {
        method: lien ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: l, url: u, categorieId: categorieId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      onSaved(data as Lien, lien ? "edit" : "add");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">
            {lien ? "Modifier le lien" : "Ajouter un lien"}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input ref={libelleRef} type="text" value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="ex : SharePoint Astreinte"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL <span className="text-red-500">*</span>
            </label>
            <input type="url" value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Thématique</label>
            <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Sans thématique —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Aucune thématique — créez-en dans la section ci-dessus pour classer ce lien.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? "Sauvegarde…" : lien ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
