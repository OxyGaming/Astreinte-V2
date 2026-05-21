"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Phone, MapPin, AlignLeft, ChevronRight, SearchX, Search, X } from "lucide-react";
import type { Fiche, Contact, Secteur, Mnemonique } from "@/lib/types";
import { matchesSearch } from "@/lib/search";
import PhoneButton from "@/components/PhoneButton";

interface Props {
  initialQuery: string;
  fiches: Fiche[];
  contacts: Contact[];
  secteurs: Secteur[];
  mnemoniques: Mnemonique[];
}

/**
 * Recherche transversale dynamique : filtrage instantané à la frappe (état
 * local, aucune navigation). L'URL est synchronisée discrètement via
 * history.replaceState pour conserver la requête au rechargement / partage.
 */
export default function SearchPageClient({ initialQuery, fiches, contacts, secteurs, mnemoniques }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim();

  // Sync léger de l'URL sans déclencher de navigation Next (pas de re-render serveur).
  useEffect(() => {
    const t = setTimeout(() => {
      const url = q ? `/recherche?q=${encodeURIComponent(q)}` : "/recherche";
      window.history.replaceState(null, "", url);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const ficheResults = q
    ? fiches.filter(
        (f) =>
          matchesSearch(f.titre, q) ||
          matchesSearch(f.resume, q) ||
          f.etapes.some((e) => matchesSearch(e.titre, q) || matchesSearch(e.description, q))
      )
    : [];

  const contactResults = q
    ? contacts.filter(
        (c) =>
          matchesSearch(c.nom, q) ||
          matchesSearch(c.role, q) ||
          matchesSearch(c.telephone, q) ||
          matchesSearch(c.note, q)
      )
    : [];

  const secteurResults = q
    ? secteurs.filter(
        (s) =>
          matchesSearch(s.nom, q) ||
          matchesSearch(s.description, q) ||
          s.points_acces.some((pa) => matchesSearch(pa.nom, q) || matchesSearch(pa.adresse, q))
      )
    : [];

  const mnemoResults = q
    ? mnemoniques.filter(
        (m) =>
          matchesSearch(m.acronyme, q) ||
          matchesSearch(m.titre, q) ||
          m.lettres.some((l) => matchesSearch(l.signification, q))
      )
    : [];

  const total = ficheResults.length + contactResults.length + secteurResults.length + mnemoResults.length;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* En-tête + champ dynamique */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Recherche</h1>
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche, contact, secteur…"
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

      {q && (
        <div className="px-4 py-5 space-y-6 lg:px-8">
          <p className="text-sm text-slate-500">
            {total === 0
              ? "Aucun résultat"
              : `${total} résultat${total > 1 ? "s" : ""} pour « ${q} »`}
          </p>

          {total === 0 && (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <SearchX size={40} className="mb-3" />
              <p className="text-sm">Essayez avec un autre terme</p>
            </div>
          )}

          {ficheResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-blue-600" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Fiches réflexes
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {ficheResults.map((f) => (
                  <Link
                    key={f.id}
                    href={`/fiches/${f.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
                  >
                    <span className="text-xs font-bold text-slate-400 w-6 flex-shrink-0">
                      {f.numero.toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{f.titre}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{f.resume}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {contactResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Phone size={14} className="text-green-600" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Contacts
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {contactResults.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <p className="font-semibold text-slate-800 text-sm">{c.nom}</p>
                    <p className="text-xs text-slate-500 mb-2">{c.role}</p>
                    <PhoneButton number={c.telephone} size="sm" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {secteurResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} className="text-amber-600" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Secteurs
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {secteurResults.map((s) => (
                  <Link
                    key={s.id}
                    href={`/secteurs/${s.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800">{s.nom}</p>
                      <p className="text-xs text-slate-500">Ligne {s.ligne}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {mnemoResults.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlignLeft size={14} className="text-purple-600" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Mnémotechniques
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {mnemoResults.map((m) => (
                  <Link
                    key={m.id}
                    href="/mnemoniques"
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
                  >
                    <span className="font-black text-blue-800 tracking-wider">{m.acronyme}</span>
                    <span className="text-sm text-slate-600">{m.titre}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
