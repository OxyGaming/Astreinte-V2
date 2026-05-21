"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPin, Train, Search, X, SearchX } from "lucide-react";
import type { Secteur } from "@/lib/types";
import { matchesSearch } from "@/lib/search";

/**
 * Regroupe les secteurs par ligne en préservant l'ordre d'apparition.
 * Les secteurs sans ligne (chaîne vide) sont regroupés sous "Sans ligne".
 */
function groupByLigne(secteurs: Secteur[]): Map<string, Secteur[]> {
  const groups = new Map<string, Secteur[]>();
  for (const s of secteurs) {
    const key = s.ligne?.trim() || "Sans ligne";
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  return new Map(
    [...groups.entries()].sort(([a], [b]) => {
      if (a === "Sans ligne") return 1;
      if (b === "Sans ligne") return -1;
      return a.localeCompare(b, "fr", { numeric: true });
    })
  );
}

function secteurMatches(s: Secteur, q: string): boolean {
  return (
    matchesSearch(s.nom, q) ||
    matchesSearch(s.description, q) ||
    matchesSearch(s.ligne, q) ||
    matchesSearch(s.trajet, q) ||
    s.points_acces.some((pa) => matchesSearch(pa.nom, q) || matchesSearch(pa.adresse, q))
  );
}

export default function SecteursClient({ secteurs }: { secteurs: Secteur[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  // Filtrage client instantané (nom, description, ligne, trajet, points d'accès).
  const filtered = q ? secteurs.filter((s) => secteurMatches(s, q)) : secteurs;
  const groups = groupByLigne(filtered);

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header + recherche */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Secteurs</h1>
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un secteur, une ligne, un point d'accès…"
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

      <div className="px-4 py-5 space-y-3 lg:px-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <SearchX size={40} className="mb-3" />
            <p className="text-sm">Aucun secteur pour « {q} »</p>
          </div>
        ) : (
          [...groups.entries()].map(([ligne, secteurLigne]) => (
            <section key={ligne}>
              <div className="flex items-center gap-2 mb-3">
                <Train size={14} className="text-slate-400" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {ligne === "Sans ligne" ? "Sans ligne" : `Ligne ${ligne}`}
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {secteurLigne.map((s) => (
                  <Link
                    key={s.id}
                    href={`/secteurs/${s.slug}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
                      <MapPin size={18} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{s.nom}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {s.description}
                      </p>
                      <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                        <span>{s.points_acces.length} accès</span>
                        <span>{s.procedures.length} procédures</span>
                        {s.pn && s.pn.length > 0 && <span>{s.pn.length} PN</span>}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
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
