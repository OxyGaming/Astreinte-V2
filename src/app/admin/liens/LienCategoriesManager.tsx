"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle, X, Loader2, Tags,
} from "lucide-react";
import { getLienIcon, getLienColor, LIEN_ICONS, LIEN_COLORS } from "@/lib/lien-ui";
import type { LienCategorie } from "@/lib/types";

interface Props {
  initialCategories: LienCategorie[];
}

type ModalState =
  | { mode: "add" }
  | { mode: "edit"; categorie: LienCategorie }
  | null;

export default function LienCategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<LienCategorie[]>(initialCategories);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleSaved(saved: LienCategorie, mode: "add" | "edit") {
    setCategories((prev) =>
      mode === "edit" ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved]
    );
    setModal(null);
    router.refresh();
  }

  async function handleDelete(cat: LienCategorie) {
    if (!confirm(`Supprimer la thématique « ${cat.nom} » ? Ses liens passeront en « Sans thématique ».`)) return;
    setDeletingId(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lien-categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDeletingId(null);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= categories.length) return;
    const previous = categories;
    const next = [...categories];
    [next[index], next[to]] = [next[to], next[index]];
    setCategories(next);
    setError(null);
    try {
      const res = await fetch("/api/admin/lien-categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setCategories(previous);
      setError("Le réordonnancement n'a pas pu être enregistré.");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-900">Thématiques</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {categories.length} thématique{categories.length !== 1 ? "s" : ""} — sections de la page Liens utiles
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
        {categories.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <Tags size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune thématique.</p>
            <p className="text-xs mt-1">Créez-en pour organiser la page Liens utiles.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {categories.map((cat, index) => {
              const Icon = getLienIcon(cat.icon);
              const color = getLienColor(cat.couleur);
              return (
                <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => move(index, -1)} disabled={index === 0} title="Monter"
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                      <ChevronUp size={15} />
                    </button>
                    <button onClick={() => move(index, 1)} disabled={index === categories.length - 1} title="Descendre"
                      className="text-gray-300 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors">
                      <ChevronDown size={15} />
                    </button>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.head}`}>
                    <Icon size={17} />
                  </div>
                  <p className="flex-1 min-w-0 font-medium text-gray-900 text-sm truncate">{cat.nom}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setModal({ mode: "edit", categorie: cat })} title="Modifier"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cat)} disabled={deletingId === cat.id} title="Supprimer"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      {deletingId === cat.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <LienCategorieFormModal
          categorie={modal.mode === "edit" ? modal.categorie : null}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function LienCategorieFormModal({ categorie, onSaved, onClose }: {
  categorie: LienCategorie | null;
  onSaved: (cat: LienCategorie, mode: "add" | "edit") => void;
  onClose: () => void;
}) {
  const nomRef = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState(categorie?.nom ?? "");
  const [icon, setIcon] = useState(categorie?.icon ?? "Link2");
  const [couleur, setCouleur] = useState(categorie?.couleur ?? "blue");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { nomRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) { setError("Le nom de la thématique est obligatoire"); return; }
    setSaving(true);
    setError(null);
    try {
      const endpoint = categorie ? `/api/admin/lien-categories/${categorie.id}` : "/api/admin/lien-categories";
      const res = await fetch(endpoint, {
        method: categorie ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim(), icon, couleur }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la sauvegarde");
      onSaved(data as LienCategorie, categorie ? "edit" : "add");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  const selectedColor = getLienColor(couleur);
  const PreviewIcon = getLienIcon(icon);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900 text-base">
            {categorie ? "Modifier la thématique" : "Nouvelle thématique"}
          </h2>
          <button type="button" onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Aperçu */}
          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedColor.head}`}>
              <PreviewIcon size={17} />
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">
              {nom.trim() || "Aperçu de la thématique"}
            </span>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nom <span className="text-red-500">*</span>
            </label>
            <input ref={nomRef} type="text" value={nom} onChange={(e) => setNom(e.target.value)}
              placeholder="ex : Boîte à outils technique"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Icône */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Icône</label>
            <div className="grid grid-cols-8 gap-1.5">
              {LIEN_ICONS.map((opt) => {
                const OptIcon = opt.Icon;
                const active = opt.value === icon;
                return (
                  <button key={opt.value} type="button" onClick={() => setIcon(opt.value)} title={opt.label}
                    className={`aspect-square flex items-center justify-center rounded-lg border transition-colors ${
                      active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}>
                    <OptIcon size={17} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Couleur d&apos;accent</label>
            <div className="flex flex-wrap gap-2.5">
              {LIEN_COLORS.map((c) => {
                const active = c.value === couleur;
                return (
                  <button key={c.value} type="button" onClick={() => setCouleur(c.value)} title={c.label}
                    className={`w-8 h-8 rounded-full transition-transform ${c.swatch} ${
                      active ? "ring-2 ring-offset-2 ring-gray-800 scale-110" : "hover:scale-105"
                    }`} />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? "Sauvegarde…" : categorie ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
