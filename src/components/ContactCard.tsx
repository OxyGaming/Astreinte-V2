"use client";

import Link from "next/link";
import PhoneButton from "./PhoneButton";
import { AlertCircle, Shield, Users, Building2, Clock, Phone, type LucideIcon } from "lucide-react";
import type { Contact } from "@/lib/types";

// ─── Config catégories ────────────────────────────────────────────────────────

const categorieConfig: Record<
  Contact["categorie"],
  { label: string; Icon: LucideIcon; color: string; badgeBg: string }
> = {
  urgence: {
    label: "Urgence",
    Icon: AlertCircle,
    color: "text-red-600",
    badgeBg: "bg-red-100 text-red-700",
  },
  astreinte: {
    label: "Astreinte",
    Icon: Shield,
    color: "text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700",
  },
  encadrement: {
    label: "Encadrement",
    Icon: Users,
    color: "text-purple-700",
    badgeBg: "bg-purple-100 text-purple-700",
  },
  externe: {
    label: "Externe",
    Icon: Building2,
    color: "text-slate-500",
    badgeBg: "bg-slate-100 text-slate-600",
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContactCardProps {
  contact: Contact;
  /** compact → liste / full → fiche ou détail */
  mode?: "compact" | "full";
  /** Rend le nom cliquable vers /contacts/[id] */
  showLink?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ContactCard({
  contact: c,
  mode = "compact",
  showLink = false,
}: ContactCardProps) {
  const cfg = categorieConfig[c.categorie];
  const { Icon } = cfg;

  const Nom = () =>
    showLink ? (
      <Link
        href={`/contacts/${c.id}`}
        className="font-bold text-slate-800 hover:text-blue-700 transition-colors"
      >
        {c.nom}
      </Link>
    ) : (
      <span className="font-bold text-slate-800">{c.nom}</span>
    );

  // ── Mode compact (listes) ──────────────────────────────────────────────────
  if (mode === "compact") {
    return (
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <Nom />
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{c.role}</p>
            {c.disponibilite && (
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                <Clock size={10} />
                {c.disponibilite}
              </span>
            )}
          </div>
        </div>
        <PhoneButton number={c.telephone} size="sm" />
      </div>
    );
  }

  // ── Mode full (fiches, page détail) ───────────────────────────────────────
  return (
    <div className="px-4 py-4">
      {/* En-tête : nom + rôle + badges */}
      <div className="mb-3">
        <p className="text-base">
          <Nom />
        </p>
        <p className="text-sm text-slate-500 mt-0.5">{c.role}</p>

        <div className="flex flex-wrap gap-1.5 mt-2">
          {/* Badge catégorie */}
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeBg}`}
          >
            <Icon size={10} />
            {cfg.label}
          </span>

          {/* Badge disponibilité — info critique */}
          {c.disponibilite && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              {c.disponibilite}
            </span>
          )}
        </div>

        {/* Note contextuelle */}
        {c.note && (
          <p className="text-xs text-slate-400 mt-2 italic leading-relaxed">{c.note}</p>
        )}
      </div>

      {/* Numéros de contact */}
      <div className="flex flex-col gap-2">
        {/* Numéro principal */}
        <PhoneButton number={c.telephone} size="md" />

        {/* Numéro alternatif (poste fixe) */}
        {c.telephone_alt && (
          <div className="flex items-center gap-2">
            <a
              href={`tel:${c.telephone_alt.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl px-3 py-2 transition-colors"
            >
              <Phone size={14} strokeWidth={2.5} />
              <span>{c.telephone_alt}</span>
            </a>
            <span className="text-xs text-slate-400">depuis un poste fixe</span>
          </div>
        )}
      </div>
    </div>
  );
}
