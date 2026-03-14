import { getAllPostes } from "@/lib/db";
import Link from "next/link";
import { Building2, MapPin, Train, ChevronRight } from "lucide-react";

export default async function PostesPage() {
  const postes = await getAllPostes();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Référentiels de compétences</h1>
        <p className="text-slate-500 mt-1">Particularités opérationnelles par poste</p>
      </div>

      <div className="space-y-3">
        {postes.map((poste) => (
          <Link
            key={poste.id}
            href={`/postes/${poste.slug}`}
            className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Building2 size={20} className="text-blue-700" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{poste.nom}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{poste.type_poste}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Train size={12} />
                      Ligne{poste.lignes.length > 1 ? "s" : ""} {poste.lignes.join(", ")}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={12} />
                      {poste.adresse.split(",").slice(-1)[0].trim()}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
