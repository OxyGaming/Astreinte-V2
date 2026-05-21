"use client";

import { useState } from "react";
import { Phone, AlertTriangle, Search, X } from "lucide-react";
import type { AnnuaireSection, ContactPoste } from "@/lib/types";
import PhoneButton from "@/components/PhoneButton";
import { matchesSearch } from "@/lib/search";

function contactMatches(c: ContactPoste, q: string): boolean {
  return (
    matchesSearch(c.nom, q) ||
    matchesSearch(c.role, q) ||
    matchesSearch(c.telephone, q) ||
    matchesSearch(c.telephoneAlt, q) ||
    matchesSearch(c.note, q)
  );
}

/**
 * Annuaire d'un poste — répertoire de contacts par section, avec filtrage
 * dynamique : la recherche restreint les contacts et masque les sections vides.
 */
export default function PosteAnnuaire({ annuaire }: { annuaire: AnnuaireSection[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  const sections = q
    ? annuaire
        .map((s) => ({ ...s, contacts: s.contacts.filter((c) => contactMatches(c, q)) }))
        .filter((s) => s.contacts.length > 0)
    : annuaire;

  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
        <Phone size={18} className="text-blue-700" />
        Annuaire
      </h2>

      {/* Recherche */}
      <div className="relative flex items-center mb-3">
        <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un contact, un rôle, un numéro…"
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
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

      {sections.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Aucun contact pour « {q} »</p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, si) => (
            <div key={section.titre || `section-${si}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {section.titre && (
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {section.titre}
                  </h3>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {section.contacts.map((contact, ci) => (
                  <div key={`${contact.nom}-${ci}`} className="px-4 py-3 gap-3">
                    {/* Contact introuvable */}
                    {contact.orphan ? (
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle size={14} className="flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{contact.nom}</p>
                          <p className="text-xs text-amber-600 mt-0.5">Contact introuvable dans le référentiel</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{contact.nom}</p>
                          {contact.role && (
                            <p className="text-xs text-slate-500">{contact.role}</p>
                          )}
                          {contact.disponibilite && (
                            <p className="text-xs text-green-700 font-medium mt-0.5">{contact.disponibilite}</p>
                          )}
                          {contact.note && (
                            <p className="text-xs text-amber-600 mt-0.5">{contact.note}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          {contact.telephone && !contact.telephone.includes("X") && (
                            <PhoneButton number={contact.telephone} />
                          )}
                          {contact.telephone?.includes("X") && (
                            <span className="text-sm text-slate-400 font-mono">{contact.telephone}</span>
                          )}
                          {contact.telephoneAlt && !contact.telephoneAlt.includes("X") && (
                            <PhoneButton number={contact.telephoneAlt} size="sm" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
