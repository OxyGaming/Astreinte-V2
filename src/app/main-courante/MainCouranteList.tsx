"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, BookOpen, Calendar, User, Tag } from "lucide-react";
import type { MainCourante } from "@/lib/types";
import { getNatureColors } from "@/lib/main-courante-colors";
import { matchesSearch } from "@/lib/search";

interface Props {
  initialEntries: MainCourante[];
  initialQuery: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Filtre plein texte sur l'ensemble des champs consultables d'une entrée. */
function entryMatches(entry: MainCourante, q: string): boolean {
  return (
    matchesSearch(entry.titre, q) ||
    matchesSearch(entry.nature, q) ||
    matchesSearch(entry.libelle, q) ||
    matchesSearch(entry.description, q) ||
    matchesSearch(entry.editedDescription, q) ||
    matchesSearch(entry.solution, q) ||
    matchesSearch(entry.avisSecurite, q) ||
    matchesSearch(entry.avisProduction, q) ||
    matchesSearch(`${entry.auteurPrenom} ${entry.auteurNom}`, q)
  );
}

export default function MainCouranteList({ initialEntries, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim();

  // Filtrage client instantané : aucun aller-retour serveur, fonctionne hors ligne.
  const entries = q ? initialEntries.filter((e) => entryMatches(e, q)) : initialEntries;

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nature, libellé, description, solution…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
      </div>

      {/* Liste */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            {q
              ? "Aucun résultat pour cette recherche."
              : "Aucune entrée validée pour le moment."}
          </p>
          <Link
            href="/main-courante/new"
            className="inline-block mt-4 text-sm text-blue-700 font-medium hover:underline"
          >
            Soyez le premier à contribuer →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">
            {entries.length} entrée{entries.length > 1 ? "s" : ""}
            {q ? ` pour « ${q} »` : ""}
          </p>
          {entries.map((entry) => {
            const teaser = entry.editedDescription ?? entry.description;
            return (
              <Link
                key={entry.id}
                href={`/main-courante/${entry.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Nature + libellé en chip */}
                    {(entry.nature || entry.libelle) && (
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {entry.nature && (
                          <span className={`inline-flex items-center gap-1 ${getNatureColors(entry.nature).chip} text-[10px] font-bold px-1.5 py-0.5 rounded`}>
                            <Tag size={9} />
                            {entry.nature}
                          </span>
                        )}
                        {entry.libelle && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {entry.libelle}
                          </span>
                        )}
                      </div>
                    )}

                    <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-800 transition-colors">
                      {entry.titre ?? (
                        <span className="italic text-slate-400 font-normal">Sans titre</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {teaser}
                    </p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {entry.ficheSlug && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                          <BookOpen size={10} />
                          Fiche liée
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar size={10} />
                        {formatDate(entry.validatedAt ?? entry.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <User size={10} />
                        {entry.auteurPrenom} {entry.auteurNom}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
