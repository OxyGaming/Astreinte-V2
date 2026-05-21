"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Train, ChevronRight, Search, X, SearchX } from "lucide-react";
import type { Poste } from "@/lib/types";
import { matchesSearch } from "@/lib/search";

function posteMatches(p: Poste, q: string): boolean {
  return (
    matchesSearch(p.nom, q) ||
    matchesSearch(p.type_poste, q) ||
    matchesSearch(p.lignes.join(" "), q) ||
    matchesSearch(p.adresse, q)
  );
}

export default function PostesClient({ postes }: { postes: Poste[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  // Filtrage client instantané (nom, type de poste, lignes, adresse).
  const filtered = q ? postes.filter((p) => posteMatches(p, q)) : postes;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Référentiels de compétences</h1>
        <p className="text-slate-500 mt-1">Particularités opérationnelles par poste</p>
      </div>

      {/* Recherche */}
      <div className="relative flex items-center mb-5">
        <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un poste, un type, une ligne…"
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <SearchX size={40} className="mb-3" />
          <p className="text-sm">Aucun poste pour « {q} »</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((poste) => (
            <Link
              key={poste.id}
              href={`/postes/${poste.slug}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <Building2 size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900">{poste.nom}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{poste.type_poste}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Train size={12} />
                        Ligne{poste.lignes.length > 1 ? "s" : ""} {poste.lignes.join(", ")}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={12} />
                        {poste.adresse.split(",").slice(-1)[0].trim()}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
