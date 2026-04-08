export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, MapPin, Train } from "lucide-react";
import { getAllSecteurs } from "@/lib/db";

export default async function SecteursPage() {
  const secteurs = await getAllSecteurs();
  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Secteurs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gier / Rive Droite Nord — Lignes 750000 & 800000
        </p>
      </div>

      <div className="px-4 py-5 space-y-3 lg:px-8">
        {["750000", "800000"].map((ligne) => {
          const secteurLigne = secteurs.filter((s) => s.ligne === ligne);
          return (
            <section key={ligne}>
              <div className="flex items-center gap-2 mb-3">
                <Train size={14} className="text-slate-400" />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Ligne {ligne}
                </h2>
              </div>
              <div className="card divide-y divide-slate-100">
                {secteurLigne.map((s) => (
                  <Link
                    key={s.id}
                    href={`/secteurs/${s.slug}`}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
                      <MapPin size={18} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{s.nom}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {s.description}
                      </p>
                      <div className="flex gap-3 mt-1.5 text-xs text-slate-400">
                        <span>
                          {s.points_acces.length} accès
                        </span>
                        <span>
                          {s.procedures.length} procédures
                        </span>
                        {s.pn && s.pn.length > 0 && (
                          <span>{s.pn.length} PN</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
