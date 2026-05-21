"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, ExternalLink, Search } from "lucide-react";
import { getLienIcon, getLienColor } from "@/lib/lien-ui";
import type { Lien, LienCategorie } from "@/lib/types";
import { matchesSearch } from "@/lib/search";

interface CategorieHub extends LienCategorie {
  liens: Lien[];
}

interface Props {
  categories: CategorieHub[];
  autres: Lien[];
}

export default function LiensHubClient({ categories, autres }: Props) {
  const [q, setQ] = useState("");
  const query = q.trim();

  const allSections = [
    ...categories.map((c) => ({ key: c.id, nom: c.nom, couleur: c.couleur, icon: c.icon, liens: c.liens })),
    ...(autres.length > 0
      ? [{ key: "__autres__", nom: "Autres", couleur: "slate", icon: "Link2", liens: autres }]
      : []),
  ];

  // Filtrage insensible casse/accents : si la thématique correspond, tous ses
  // liens sont conservés ; sinon on filtre les liens par libellé ou URL.
  const sections = allSections
    .map((s) => {
      if (!query) return s;
      if (matchesSearch(s.nom, query)) return s;
      return {
        ...s,
        liens: s.liens.filter(
          (l) => matchesSearch(l.libelle, query) || matchesSearch(l.url, query)
        ),
      };
    })
    .filter((s) => s.liens.length > 0);

  const total = allSections.reduce((n, s) => n + s.liens.length, 0);
  const empty = total === 0;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 pt-5 pb-5 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Accueil
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={16} className="opacity-80" />
          <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Ressources</span>
        </div>
        <h1 className="text-xl font-bold leading-tight">Liens utiles</h1>
        <p className="text-sm opacity-80 mt-1">Portails et outils, classés par thématique.</p>

        {!empty && (
          <div className="mt-4 relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un lien…"
              className="w-full bg-white rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none shadow-sm"
            />
          </div>
        )}
      </div>

      <div className="px-4 py-6 lg:px-8">
        {empty ? (
          <div className="text-center py-12 text-slate-400">
            <Link2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun lien utile pour le moment.</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Search size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun lien ne correspond à « {q} ».</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((s) => {
              const color = getLienColor(s.couleur);
              const Icon = getLienIcon(s.icon);
              return (
                <section key={s.key}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color.head}`}>
                      <Icon size={18} />
                    </div>
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex-1">{s.nom}</h2>
                    <span className="text-xs font-bold text-slate-500 bg-slate-200/70 rounded-full px-2 py-0.5">
                      {s.liens.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {s.liens.map((lien) => (
                      <a
                        key={lien.id}
                        href={lien.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group bg-white border border-slate-200 rounded-xl p-3.5 transition-all hover:shadow-md ${color.border}`}
                      >
                        <div className="flex items-start justify-between mb-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.tile}`}>
                            <Icon size={17} />
                          </div>
                          <ExternalLink size={15} className={`text-slate-300 transition-colors ${color.arrow}`} />
                        </div>
                        <p className="font-semibold text-sm text-slate-800 leading-tight">{lien.libelle}</p>
                      </a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
