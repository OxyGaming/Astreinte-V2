"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, AlertCircle, Search, X, SearchX } from "lucide-react";
import type { Fiche, Categorie } from "@/lib/types";
import { matchesSearch } from "@/lib/search";

const categorieLabels: Record<Categorie, string> = {
  accident: "Accidents",
  incident: "Incidents",
  securite: "Sécurité",
  "gestion-agent": "Gestion agent",
  evacuation: "Évacuation",
};

function ficheMatches(f: Fiche, q: string): boolean {
  return (
    matchesSearch(f.titre, q) ||
    matchesSearch(f.resume, q) ||
    matchesSearch(f.mnemonique, q) ||
    f.etapes.some((e) => matchesSearch(e.titre, q) || matchesSearch(e.description, q))
  );
}

export default function FichesClient({ fiches }: { fiches: Fiche[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  // Filtrage client instantané (titre, résumé, mnémonique, étapes).
  const filtered = q ? fiches.filter((f) => ficheMatches(f, q)) : fiches;
  const categories = Array.from(new Set(filtered.map((f) => f.categorie)));

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header + recherche */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Fiches réflexes</h1>
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche par titre, résumé, étape…"
            className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 text-slate-400 hover:text-slate-600"
              aria-label="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <SearchX size={40} className="mb-3" />
            <p className="text-sm">Aucune fiche pour « {q} »</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                {categorieLabels[cat]}
              </h2>
              <div className="card divide-y divide-slate-100">
                {filtered
                  .filter((f) => f.categorie === cat)
                  .sort((a, b) => a.numero - b.numero)
                  .map((fiche) => (
                    <Link
                      key={fiche.id}
                      href={`/fiches/${fiche.slug}`}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-400 w-6 flex-shrink-0">
                        {fiche.numero.toString().padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">
                          {fiche.titre}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {fiche.resume}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {fiche.priorite === "urgente" && (
                          <AlertCircle size={14} className="text-red-500" />
                        )}
                        <ChevronRight size={16} className="text-slate-300" />
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
