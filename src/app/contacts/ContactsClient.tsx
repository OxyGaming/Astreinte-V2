"use client";

import { useState } from "react";
import { AlertCircle, Shield, Users, Building2, Search, X, UserX } from "lucide-react";
import type { Contact } from "@/lib/types";
import ContactCard from "@/components/ContactCard";
import { matchesSearch } from "@/lib/search";

const categorieConfig = {
  urgence:     { label: "Urgences & Opérations", icon: AlertCircle, color: "text-red-600" },
  astreinte:   { label: "Astreintes",            icon: Shield,      color: "text-blue-700" },
  encadrement: { label: "Encadrement",           icon: Users,       color: "text-purple-700" },
  externe:     { label: "Contacts externes",     icon: Building2,   color: "text-slate-600" },
} as const;

const categories = ["urgence", "astreinte", "encadrement", "externe"] as const;

function contactMatches(c: Contact, q: string): boolean {
  return (
    matchesSearch(c.nom, q) ||
    matchesSearch(c.role, q) ||
    matchesSearch(c.telephone, q) ||
    matchesSearch(c.telephone_alt, q) ||
    matchesSearch(c.note, q)
  );
}

export default function ContactsClient({ contacts }: { contacts: Contact[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();

  // Filtrage client instantané sur tous les champs du contact.
  const filtered = q ? contacts.filter((c) => contactMatches(c, q)) : contacts;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header + recherche */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Contacts utiles</h1>
        <p className="text-sm text-slate-500 mt-1 mb-4">Appuyez sur un numéro pour appeler</p>
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un contact, un rôle, un numéro…"
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
            <UserX size={40} className="mb-3" />
            <p className="text-sm">Aucun contact pour « {q} »</p>
          </div>
        ) : (
          categories.map((cat) => {
            const config = categorieConfig[cat];
            const Icon = config.icon;
            const contactsCat = filtered.filter((c) => c.categorie === cat);
            if (contactsCat.length === 0) return null;

            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={config.color} />
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {config.label}
                  </h2>
                </div>
                <div className="card divide-y divide-slate-100">
                  {contactsCat.map((c) => (
                    <ContactCard key={c.id} contact={c} mode="compact" showLink={true} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
