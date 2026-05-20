import { Link2, ExternalLink, AlertTriangle } from "lucide-react";
import type { ResolvedLien } from "@/lib/types";

/**
 * Liste de liens utiles résolus, affichée côté front-office.
 * Le titre de section est fourni par la page appelante.
 */
export default function LiensList({ liens }: { liens: ResolvedLien[] }) {
  if (liens.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
      {liens.map((lien, i) =>
        lien.orphan || !lien.url ? (
          <div key={i} className="flex items-center gap-3 px-4 py-3 text-slate-400">
            <AlertTriangle size={18} className="flex-shrink-0 text-amber-400" />
            <span className="text-sm">{lien.libelle} — lien indisponible</span>
          </div>
        ) : (
          <a
            key={i}
            href={lien.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
              <Link2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-800 transition-colors">
                {lien.libelle}
              </p>
            </div>
            <ExternalLink
              size={16}
              className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
            />
          </a>
        )
      )}
    </div>
  );
}
