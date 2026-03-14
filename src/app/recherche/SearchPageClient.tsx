"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { FileText, Phone, MapPin, AlignLeft, ChevronRight, SearchX } from "lucide-react";
import type { Fiche, Contact, Secteur, Mnemonique } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import PhoneButton from "@/components/PhoneButton";

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matches(text: string, q: string) {
  return normalize(text).includes(normalize(q));
}

interface SearchData {
  fiches: Fiche[];
  contacts: Contact[];
  secteurs: Secteur[];
  mnemoniques: Mnemonique[];
}

function SearchResults({ fiches, contacts, secteurs, mnemoniques }: SearchData) {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  if (!q.trim()) return null;

  const ficheResults = fiches.filter(
    (f) =>
      matches(f.titre, q) ||
      matches(f.resume, q) ||
      f.etapes.some((e) => matches(e.titre, q) || matches(e.description, q))
  );

  const contactResults = contacts.filter(
    (c) =>
      matches(c.nom, q) ||
      matches(c.role, q) ||
      matches(c.telephone, q) ||
      (c.note && matches(c.note, q))
  );

  const secteurResults = secteurs.filter(
    (s) =>
      matches(s.nom, q) ||
      matches(s.description, q) ||
      s.points_acces.some((pa) => matches(pa.nom, q) || (pa.adresse && matches(pa.adresse, q)))
  );

  const mnemoResults = mnemoniques.filter(
    (m) =>
      matches(m.acronyme, q) ||
      matches(m.titre, q) ||
      m.lettres.some((l) => matches(l.signification, q))
  );

  const total = ficheResults.length + contactResults.length + secteurResults.length + mnemoResults.length;

  return (
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
  );
}

export default function SearchPageClient(data: SearchData) {
  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Recherche</h1>
        <SearchBar autoFocus />
      </div>
      <Suspense fallback={<div className="px-4 py-8 text-center text-slate-400">Recherche…</div>}>
        <SearchResults {...data} />
      </Suspense>
    </div>
  );
}
