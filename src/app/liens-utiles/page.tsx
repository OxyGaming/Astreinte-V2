export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, Link2, ExternalLink } from "lucide-react";
import { getAllLiens } from "@/lib/db";

export default async function LiensUtilesPage() {
  const liens = await getAllLiens();

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="px-4 pt-5 pb-5 lg:px-8 bg-blue-900 text-white">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Accueil
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={18} className="opacity-80" />
          <span className="text-xs font-bold opacity-60 uppercase tracking-wide">Ressources</span>
        </div>
        <h1 className="text-xl font-bold leading-tight">Liens utiles</h1>
        <p className="text-sm opacity-80 mt-1">
          Portails, outils et documentation de référence.
        </p>
      </div>

      <div className="py-5 px-4 lg:px-8">
        {liens.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Link2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucun lien utile pour le moment.</p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {liens.map((lien) => (
              <a
                key={lien.id}
                href={lien.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <Link2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-800 transition-colors">
                    {lien.libelle}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{lien.url}</p>
                </div>
                <ExternalLink
                  size={16}
                  className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
