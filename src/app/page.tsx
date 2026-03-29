export const dynamic = "force-dynamic";

import Link from "next/link";
import { Shield, Phone, FileText, MapPin, AlignLeft, AlertTriangle, ChevronRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PhoneButton from "@/components/PhoneButton";
import { getAllContacts, getAllFiches, getAllMnemoniques } from "@/lib/db";

const CATEGORIE_COLOR: Record<string, string> = {
  accident: "bg-red-600",
  incident: "bg-orange-600",
  securite: "bg-amber-600",
  "gestion-agent": "bg-blue-600",
  evacuation: "bg-orange-600",
};

export default async function Home() {
  const [fiches, contacts, mnemoniques] = await Promise.all([
    getAllFiches(),
    getAllContacts(),
    getAllMnemoniques(),
  ]);

  const contactsUrgents = contacts.filter((c) => c.categorie === "urgence").slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto lg:max-w-none">
      {/* Header */}
      <div className="bg-blue-900 text-white px-4 pt-8 pb-6 lg:px-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-blue-800 rounded-2xl">
            <Shield size={28} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Astreinte</h1>
            <p className="text-blue-300 text-sm">UOC Zone Diffuse — Secteur Gier / RDN</p>
          </div>
        </div>
        <SearchBar />
      </div>

      <div className="px-4 py-5 space-y-6 lg:px-8 lg:py-6">

        {/* Numéros urgents */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Numéros urgents
          </h2>
          <div className="card divide-y divide-slate-100">
            {contactsUrgents.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{c.nom}</p>
                  <p className="text-xs text-slate-500">{c.role}</p>
                  {c.telephone_alt && (
                    <p className="text-xs text-blue-600 font-medium mt-0.5">
                      {c.telephone_alt} depuis fixe
                    </p>
                  )}
                </div>
                <PhoneButton number={c.telephone} size="sm" />
              </div>
            ))}
            <Link
              href="/contacts"
              className="flex items-center justify-between px-4 py-3 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <span className="text-sm font-medium">Tous les contacts</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        {/* Fiches courantes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Fiches réflexes fréquentes
            </h2>
            <Link
              href="/fiches"
              className="text-xs text-blue-700 font-medium hover:underline"
            >
              Voir tout
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {fiches.filter((f) => f.featured).map((f) => (
              <Link
                key={f.slug}
                href={`/fiches/${f.slug}`}
                className="card p-4 hover:shadow-md transition-shadow active:scale-95"
              >
                <div className={`w-2 h-2 rounded-full ${CATEGORIE_COLOR[f.categorie] ?? "bg-slate-500"} mb-2`} />
                <p className="text-sm font-semibold text-slate-800 leading-tight">{f.titre}</p>
                <div className="flex items-center gap-1 mt-2 text-blue-700">
                  <span className="text-xs font-medium">Ouvrir</span>
                  <ChevronRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Navigation modules */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            Modules
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { href: "/fiches", icon: FileText, label: "Fiches réflexes", sub: `${fiches.length} fiches`, color: "text-blue-700 bg-blue-50" },
              { href: "/contacts", icon: Phone, label: "Contacts utiles", sub: `${contacts.length} contacts`, color: "text-green-700 bg-green-50" },
              { href: "/secteurs", icon: MapPin, label: "Secteurs", sub: "Gier / RDN", color: "text-amber-700 bg-amber-50" },
              { href: "/mnemoniques", icon: AlignLeft, label: "Mnémotechniques", sub: `${mnemoniques.length} acronymes`, color: "text-purple-700 bg-purple-50" },
            ].map(({ href, icon: Icon, label, sub, color }) => (
              <Link
                key={href}
                href={href}
                className="card p-4 hover:shadow-md transition-shadow active:scale-95"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon size={20} />
                </div>
                <p className="font-semibold text-sm text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Avertissement */}
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Ce document est un appui. Il ne remplace pas les référentiels réglementaires applicables. En cas de doute, contacter le COGC.
          </p>
        </div>
      </div>
    </div>
  );
}
