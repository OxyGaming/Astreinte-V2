"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardCheck, CheckCircle2, AlertTriangle, Wrench, BookOpen } from "lucide-react";

interface ProcedureInfo {
  id: string;
  slug: string;
  titre: string;
  description: string | null;
  version: string;
  typeProcedure: string;
}

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; bg: string; badge: string }> = {
  cessation: { label: "Cessation de service", Icon: ClipboardCheck, bg: "bg-blue-50 border-blue-200",   badge: "bg-blue-100 text-blue-700" },
  reprise:   { label: "Reprise de service",   Icon: CheckCircle2,   bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700" },
  incident:  { label: "Gestion d'incident",   Icon: AlertTriangle,  bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  travaux:   { label: "Travaux",              Icon: Wrench,         bg: "bg-orange-50 border-orange-200", badge: "bg-orange-100 text-orange-700" },
  autre:     { label: "Procédures",           Icon: BookOpen,       bg: "bg-slate-50 border-slate-200",  badge: "bg-slate-100 text-slate-700" },
};

export default function ProceduresHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState("");
  const [posteNom, setPosteNom] = useState("");
  const [grouped, setGrouped] = useState<Record<string, ProcedureInfo[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ slug: s }) => setSlug(s));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/postes/${slug}/procedures`)
      .then((r) => r.json())
      .then((data) => {
        setPosteNom(data.poste?.nom ?? "");
        const g: Record<string, ProcedureInfo[]> = {};
        for (const p of data.procedures ?? []) {
          if (!g[p.typeProcedure]) g[p.typeProcedure] = [];
          g[p.typeProcedure].push(p);
        }
        setGrouped(g);
      })
      .catch(() => setError("Impossible de charger les procédures."));
  }, [slug]);

  const types = Object.keys(grouped);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={slug ? `/postes/${slug}` : "/postes"}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft size={16} />
        {posteNom || "Poste"}
      </Link>

      <div className="bg-blue-900 text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-800 rounded-xl">
            <ClipboardCheck size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Procédures associées au poste</h1>
            {posteNom && <p className="text-blue-300 text-sm mt-0.5">{posteNom}</p>}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {types.length === 0 && !error && (
        <div className="text-center py-10 text-slate-400 text-sm">
          Aucune procédure configurée pour ce poste.
        </div>
      )}

      {types.map((type) => {
        const meta = TYPE_META[type] ?? TYPE_META.autre;
        const Icon = meta.Icon;
        const procs = grouped[type];
        return (
          <div key={type} className={`rounded-xl border ${meta.bg} overflow-hidden`}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-inherit">
              <Icon size={15} className="text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">{meta.label}</span>
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                {procs.length} procédure{procs.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-inherit">
              {procs.map((proc) => (
                <Link
                  key={proc.id}
                  href={`/postes/${slug}/procedures/${type}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-white/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{proc.titre}</p>
                    {proc.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{proc.description}</p>
                    )}
                    <span className="inline-block mt-1 text-xs text-slate-400 font-mono">v{proc.version}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 flex-shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
