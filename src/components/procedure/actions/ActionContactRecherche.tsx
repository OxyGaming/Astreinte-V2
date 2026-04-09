"use client";

import { useState, useMemo } from "react";
import { Search, X, UserSearch, ExternalLink, Clock, ChevronRight } from "lucide-react";
import type { ActionMetier, ValeurReponse } from "@/lib/procedure/types";
import type { Contact } from "@/lib/types";
import ContactCard from "@/components/ContactCard";
import PhoneButton from "@/components/PhoneButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORIE_LABELS: Record<Contact["categorie"], string> = {
  urgence: "Urgences",
  astreinte: "Astreintes",
  encadrement: "Encadrement",
  externe: "Externe",
};

const CATEGORIE_FULL_LABELS: Record<Contact["categorie"], string> = {
  urgence: "Urgences & Opérations",
  astreinte: "Astreintes",
  encadrement: "Encadrement",
  externe: "Contacts externes",
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function matchContact(contact: Contact, query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  return (
    normalize(contact.nom).includes(q) ||
    normalize(contact.role).includes(q) ||
    normalize(CATEGORIE_LABELS[contact.categorie]).includes(q)
  );
}

// ─── Ligne de résultat ────────────────────────────────────────────────────────
// Sépare l'action "sélectionner" (zone gauche) de l'action "appeler" (bouton droite)
// pour éviter les éléments interactifs imbriqués (nested buttons).

function ResultRow({
  contact,
  showCategorie,
  onSelect,
}: {
  contact: Contact;
  showCategorie: boolean;
  onSelect: (c: Contact) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 hover:bg-blue-50 transition-colors group">
      {/* Zone cliquable : sélectionner le contact */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(contact)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(contact)}
        className="flex-1 min-w-0 cursor-pointer focus:outline-none"
        aria-label={`Sélectionner ${contact.nom}`}
      >
        <p className="font-bold text-slate-800 text-sm truncate">{contact.nom}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{contact.role}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {contact.disponibilite && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              <Clock size={9} />
              {contact.disponibilite}
            </span>
          )}
          {showCategorie && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {CATEGORIE_LABELS[contact.categorie]}
            </span>
          )}
        </div>
      </div>

      {/* Appel direct — indépendant de la sélection */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <PhoneButton number={contact.telephone} size="sm" />
        <ChevronRight size={13} className="text-slate-300 flex-shrink-0" />
      </div>
    </div>
  );
}

// ─── En-tête de l'action ─────────────────────────────────────────────────────

function ActionHeader({ action }: { action: ActionMetier }) {
  return (
    <div className="flex items-start gap-2">
      <UserSearch size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-snug">
          {action.label}
          {action.obligatoire && (
            <span
              className="ml-1.5 align-middle text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
              title="Sélection obligatoire pour avancer"
            >
              Obligatoire
            </span>
          )}
        </p>
        {action.description && (
          <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
        )}
        {action.note && (
          <p className="text-xs text-amber-600 font-medium mt-0.5">{action.note}</p>
        )}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  action: ActionMetier;
  valeur: ValeurReponse; // contactId sélectionné (string) ou null
  onChange: (v: ValeurReponse) => void;
  allContacts: Contact[];
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ActionContactRecherche({
  action,
  valeur,
  onChange,
  allContacts,
}: Props) {
  const [query, setQuery] = useState("");

  // Pool filtré par catégorie
  const pool = useMemo(() => {
    if (!action.filtreCategorieContact) return allContacts;
    return allContacts.filter((c) => c.categorie === action.filtreCategorieContact);
  }, [allContacts, action.filtreCategorieContact]);

  // Résultats de recherche (max 6)
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return pool.filter((c) => matchContact(c, query)).slice(0, 6);
  }, [pool, query]);

  // Contact sélectionné (résolu depuis allContacts)
  const selected = useMemo(
    () => (valeur ? allContacts.find((c) => c.id === valeur) ?? null : null),
    [valeur, allContacts]
  );

  // Contact introuvable : valeur non-null mais absent de la liste (contact supprimé)
  const contactIntrouvable = valeur !== null && valeur !== undefined && !selected;

  const handleSelect = (contact: Contact) => {
    onChange(contact.id);
    setQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
  };

  const showCategorieBadge = !action.filtreCategorieContact;

  // ── Vue : contact introuvable ──────────────────────────────────────────────
  if (contactIntrouvable) {
    return (
      <div className="space-y-3">
        <ActionHeader action={action} />
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-700 font-medium">
            Contact introuvable — il a peut-être été supprimé ou modifié.
          </p>
          <button
            onClick={handleClear}
            className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors flex-shrink-0"
          >
            Nouvelle recherche
          </button>
        </div>
      </div>
    );
  }

  // ── Vue : contact sélectionné ──────────────────────────────────────────────
  if (selected) {
    return (
      <div className="space-y-3">
        <ActionHeader action={action} />

        <div className="flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-green-700">Contact sélectionné</span>
        </div>

        {/* Carte contact complète — toutes les infos critiques visibles */}
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <ContactCard contact={selected} mode="full" showLink={false} />
          <div className="px-4 pb-3 border-t border-green-100 pt-2">
            <a
              href={`/contacts/${selected.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink size={11} />
              Fiche contact complète
            </a>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <X size={13} />
          Changer de contact
        </button>
      </div>
    );
  }

  // ── Vue : recherche ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <ActionHeader action={action} />

      {/* Filtre catégorie actif */}
      {action.filtreCategorieContact && (
        <p className="text-xs text-slate-500 px-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
          Limité à :{" "}
          <span className="font-semibold text-slate-700">
            {CATEGORIE_FULL_LABELS[action.filtreCategorieContact as Contact["categorie"]] ?? action.filtreCategorieContact}
          </span>
        </p>
      )}

      {/* Champ de recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, rôle…"
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
          autoComplete="off"
          autoCapitalize="off"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Effacer la recherche"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Résultats de recherche */}
      {query.trim() && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {results.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-slate-500">
                Aucun contact pour &laquo;&nbsp;{query}&nbsp;&raquo;
              </p>
              <a
                href="/contacts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1.5 transition-colors"
              >
                <ExternalLink size={10} />
                Consulter l&apos;annuaire complet
              </a>
            </div>
          ) : (
            <>
              <div className="px-4 py-1.5 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {results.length} résultat{results.length > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-slate-400 italic hidden sm:block">
                  ← Appuyez pour sélectionner · Appelez directement →
                </span>
              </div>
              {results.map((contact) => (
                <ResultRow
                  key={contact.id}
                  contact={contact}
                  showCategorie={showCategorieBadge}
                  onSelect={handleSelect}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Accès rapide : pool ≤ 5 sans saisie */}
      {!query.trim() && pool.length > 0 && pool.length <= 5 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          <div className="px-4 py-1.5 bg-slate-50">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Contacts disponibles
            </span>
          </div>
          {pool.map((contact) => (
            <ResultRow
              key={contact.id}
              contact={contact}
              showCategorie={showCategorieBadge}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Pool vide (filtre actif mais aucun contact) */}
      {!query.trim() && pool.length === 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
          <p className="text-sm text-slate-500">
            Aucun contact disponible
            {action.filtreCategorieContact ? " dans cette catégorie" : ""}.
          </p>
          <a
            href="/contacts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1.5 transition-colors"
          >
            <ExternalLink size={10} />
            Voir l&apos;annuaire complet
          </a>
        </div>
      )}

      {/* Lien annuaire (pool > 5, pas de recherche active) */}
      {pool.length > 5 && !query.trim() && (
        <a
          href="/contacts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors px-1"
        >
          <ExternalLink size={11} />
          Voir tous les contacts
        </a>
      )}
    </div>
  );
}
