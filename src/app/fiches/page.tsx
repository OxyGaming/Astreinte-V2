export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { getAllFiches } from "@/lib/db";
import type { Categorie } from "@/lib/types";
import SearchBar from "@/components/SearchBar";

const categorieLabels: Record<Categorie, string> = {
  accident: "Accidents",
  incident: "Incidents",
  securite: "Sécurité",
  "gestion-agent": "Gestion agent",
  evacuation: "Évacuation",
};

const categorieColors: Record<Categorie, string> = {
  accident: "bg-red-100 text-red-700",
  incident: "bg-orange-100 text-orange-700",
  securite: "bg-amber-100 text-amber-700",
  "gestion-agent": "bg-purple-100 text-purple-700",
  evacuation: "bg-blue-100 text-blue-700",
};

export default async function FichesPage() {
  const fiches = await getAllFiches();
  const categories = Array.from(new Set(fiches.map((f) => f.categorie)));
  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900 mb-4">Fiches réflexes</h1>
        <SearchBar />
      </div>

      <div className="px-4 py-5 space-y-6 lg:px-8">
        {categories.map((cat) => (
          <section key={cat}>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              {categorieLabels[cat]}
            </h2>
            <div className="card divide-y divide-slate-100">
              {fiches
                .filter((f) => f.categorie === cat)
                .sort((a, b) => a.numero - b.numero)
                .map((fiche) => (
                  <Link
                    key={fiche.id}
                    href={`/fiches/${fiche.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <span className="text-xs font-bold text-slate-400 w-6 flex-shrink-0">
                      {fiche.numero.toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">
                        {fiche.titre}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {fiche.resume}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fiche.priorite === "urgente" && (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
