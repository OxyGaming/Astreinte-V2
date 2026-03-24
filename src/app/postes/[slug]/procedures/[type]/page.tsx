"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck, CheckCircle2, AlertTriangle, Wrench, BookOpen, Loader2 } from "lucide-react";

interface PosteInfo { id: string; nom: string; slug: string }
interface ProcedureInfo { id: string; slug: string; titre: string; description: string | null; version: string }

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; headerBg: string; btnBg: string }> = {
  cessation: { label: "Cessation de service", Icon: ClipboardCheck,  headerBg: "bg-blue-900",   btnBg: "bg-blue-700 hover:bg-blue-800" },
  reprise:   { label: "Reprise de service",   Icon: CheckCircle2,    headerBg: "bg-green-900",  btnBg: "bg-green-700 hover:bg-green-800" },
  incident:  { label: "Gestion d'incident",   Icon: AlertTriangle,   headerBg: "bg-amber-800",  btnBg: "bg-amber-600 hover:bg-amber-700" },
  travaux:   { label: "Travaux",              Icon: Wrench,          headerBg: "bg-orange-800", btnBg: "bg-orange-600 hover:bg-orange-700" },
  autre:     { label: "Procédures",           Icon: BookOpen,        headerBg: "bg-slate-800",  btnBg: "bg-slate-700 hover:bg-slate-800" },
};

export default function ProcedureTypePage({
  params,
}: {
  params: Promise<{ slug: string; type: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("");
  const [poste, setPoste] = useState<PosteInfo | null>(null);
  const [procedures, setProcedures] = useState<ProcedureInfo[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ slug: s, type: t }) => { setSlug(s); setType(t); });
  }, [params]);

  useEffect(() => {
    if (!slug || !type) return;
    fetch(`/api/postes/${slug}/procedures?type=${type}`)
      .then((r) => r.json())
      .then((data) => { setPoste(data.poste); setProcedures(data.procedures ?? []); })
      .catch(() => setError("Impossible de charger les procédures."));
  }, [slug, type]);

  const handleDemarrer = async (procedure: ProcedureInfo) => {
    if (!poste) return;
    setStarting(procedure.id);
    setError(null);
    try {
      const res = await fetch(`/api/procedures/${procedure.slug}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posteId: poste.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors du démarrage");
      }
      const { sessionId } = await res.json();
      router.push(`/procedures/session/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setStarting(null);
    }
  };

  const meta = TYPE_META[type] ?? TYPE_META.autre;
  const Icon = meta.Icon;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={slug ? `/postes/${slug}` : "/postes"}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft size={16} />
        {poste?.nom ?? "Poste"}
      </Link>

      <div className={`${meta.headerBg} text-white rounded-2xl p-5`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Icon size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{meta.label}</h1>
            {poste && <p className="text-white/60 text-sm mt-0.5">{poste.nom}</p>}
          </div>
        </div>
      </div>

      {procedures.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Procédures disponibles
          </h2>
          {procedures.map((proc) => (
            <div key={proc.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="mb-3">
                <p className="text-base font-bold text-slate-900">{proc.titre}</p>
                {proc.description && (
                  <p className="text-sm text-slate-500 mt-0.5">{proc.description}</p>
                )}
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded font-mono">
                  v{proc.version}
                </span>
              </div>
              <button
                onClick={() => handleDemarrer(proc)}
                disabled={!!starting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${
                  starting === proc.id
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : `${meta.btnBg} text-white`
                }`}
              >
                {starting === proc.id ? (
                  <><Loader2 size={16} className="animate-spin" />Démarrage…</>
                ) : (
                  <><Icon size={16} />Démarrer la procédure</>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Aucune procédure configurée pour ce poste.
          </div>
        )
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
