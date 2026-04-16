"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search, ChevronRight, BookOpen, Calendar, User } from "lucide-react";
import type { MainCourante } from "@/lib/types";

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

export default function MainCouranteList({ initialEntries, initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [entries, setEntries] = useState<MainCourante[]>(initialEntries);
  const [isPending, startTransition] = useTransition();

  const search = (q: string) => {
    setQuery(q);
    startTransition(async () => {
      const res = await fetch(`/api/main-courante?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Rechercher par mots-clés…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            …
          </span>
        )}
      </div>

      {/* Liste */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">
            {query
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
            {query ? ` pour « ${query} »` : ""}
          </p>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/main-courante/${entry.id}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 text-sm leading-snug group-hover:text-blue-800 transition-colors">
                    {entry.titre}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {entry.editedDescription ?? entry.description}
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
          ))}
        </div>
      )}
    </div>
  );
}
