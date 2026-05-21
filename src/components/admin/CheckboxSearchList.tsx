"use client";

/**
 * CheckboxSearchList — liste de cases à cocher avec recherche intégrée.
 * Composant admin partagé pour les associations multiples (ex: contacts/secteurs
 * liés à une fiche). Le filtre est insensible à la casse et aux accents ; un
 * compteur rappelle le nombre d'éléments cochés (utile quand la recherche en
 * masque une partie).
 */

import { useState } from "react";
import { Search, X } from "lucide-react";
import { matchesSearch } from "@/lib/search";

export interface CheckboxItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  title: string;
  items: CheckboxItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}

export default function CheckboxSearchList({ title, items, selectedIds, onToggle, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  const filtered = q
    ? items.filter((it) => matchesSearch(it.label, q) || matchesSearch(it.sublabel, q))
    : items;

  const selectedCount = selectedIds.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        {selectedCount > 0 && (
          <span className="text-xs font-medium text-blue-600">
            {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Recherche */}
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? "Rechercher…"}
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Effacer la recherche"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4 italic">Aucun résultat</p>
        ) : (
          filtered.map((it) => (
            <label
              key={it.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(it.id)}
                onChange={() => onToggle(it.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{it.label}</p>
                {it.sublabel && <p className="text-xs text-gray-400 truncate">{it.sublabel}</p>}
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
