"use client";

/**
 * ContactPicker — sélecteur de contact avec recherche (composant admin partagé).
 * Utilisé dans :
 *   - Éditeur de procédures (ActionCard, type "confirmation")
 *   - Éditeur d'annuaire poste (AnnuaireForm, mode "lié")
 *
 * Fetch via GET /api/admin/contacts (protégé EDITOR+).
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, X, Phone, Check, ChevronDown, Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContactOption {
  id: string;
  nom: string;
  role: string;
  categorie: string;
  telephone: string;
  telephoneAlt: string | null;
  disponibilite: string | null;
}

const CATEGORIE_LABELS: Record<string, string> = {
  urgence: "Urgence",
  astreinte: "Astreinte",
  encadrement: "Encadrement",
  externe: "Externe",
};

const CATEGORIE_COLORS: Record<string, string> = {
  urgence: "bg-red-100 text-red-700",
  astreinte: "bg-blue-100 text-blue-700",
  encadrement: "bg-purple-100 text-purple-700",
  externe: "bg-slate-100 text-slate-600",
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** contactId actuellement sélectionné (string vide = aucun) */
  value: string;
  onChange: (contactId: string, contact?: ContactOption) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ContactPicker({ value, onChange }: Props) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Chargement des contacts au premier clic (lazy)
  useEffect(() => {
    if (!open || contacts.length > 0) return;
    setLoading(true);
    fetch("/api/admin/contacts")
      .then((r) => {
        if (!r.ok) throw new Error("Accès refusé ou erreur serveur");
        return r.json();
      })
      .then((data: ContactOption[]) => {
        setContacts(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, contacts.length]);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus auto sur le champ de recherche
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const selected = useMemo(
    () => (value ? contacts.find((c) => c.id === value) : null),
    [value, contacts]
  );

  const results = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = normalize(query);
    return contacts.filter(
      (c) =>
        normalize(c.nom).includes(q) ||
        normalize(c.role).includes(q) ||
        normalize(CATEGORIE_LABELS[c.categorie] ?? c.categorie).includes(q)
    );
  }, [contacts, query]);

  const handleSelect = (contact: ContactOption) => {
    onChange(contact.id, contact);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Déclencheur */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 rounded border px-2.5 py-2 text-sm text-left transition-colors ${
          open
            ? "border-blue-500 ring-1 ring-blue-500 bg-white"
            : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        {selected ? (
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span
              className={`flex-shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                CATEGORIE_COLORS[selected.categorie] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {CATEGORIE_LABELS[selected.categorie] ?? selected.categorie}
            </span>
            <span className="font-semibold text-gray-800 truncate">{selected.nom}</span>
            <span className="text-gray-400 text-xs truncate hidden sm:block">— {selected.role}</span>
            <span className="flex-shrink-0 ml-auto flex items-center gap-1 text-xs text-blue-700 font-mono">
              <Phone size={11} />
              {selected.telephone}
            </span>
          </div>
        ) : (
          <span className="flex-1 text-gray-400">Rechercher un contact…</span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors"
              title="Retirer le contact"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Panneau déroulant */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Barre de recherche */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, rôle, catégorie…"
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Corps */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Chargement…
              </div>
            ) : error ? (
              <p className="px-4 py-4 text-sm text-red-600 text-center">{error}</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400 text-center italic">
                Aucun contact trouvé
              </p>
            ) : (
              results.map((contact) => {
                const isSelected = contact.id === value;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(contact)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5 w-4">
                      {isSelected && <Check size={14} className="text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{contact.nom}</span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            CATEGORIE_COLORS[contact.categorie] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {CATEGORIE_LABELS[contact.categorie] ?? contact.categorie}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{contact.role}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs font-mono text-blue-700 flex items-center gap-1">
                        <Phone size={10} />
                        {contact.telephone}
                      </p>
                      {contact.telephoneAlt && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {contact.telephoneAlt}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pied */}
          {!loading && !error && (
            <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {results.length} contact{results.length > 1 ? "s" : ""}
                {query ? ` pour « ${query} »` : ""}
              </span>
              {selected && (
                <span className="text-xs text-blue-600 font-medium truncate max-w-[60%]">
                  ✓ {selected.nom}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ID affiché sous le picker */}
      {value && (
        <p className="mt-1 text-xs text-gray-400 font-mono truncate">
          ID : {value}
        </p>
      )}
    </div>
  );
}
