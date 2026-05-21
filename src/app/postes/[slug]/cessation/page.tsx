/**
 * /postes/[slug]/cessation
 * Page d'entrée : liste les procédures de type "cessation" associées au poste,
 * permet à l'agent de saisir son nom et de démarrer une session.
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck, Loader2, User } from "lucide-react";
import { startProcedureSession } from "@/lib/procedure/start-session";
import type { ProcedureMetier } from "@/lib/procedure/types";

interface PosteInfo {
  id: string;
  nom: string;
  slug: string;
}

export default function CessationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>("");
  const [poste, setPoste] = useState<PosteInfo | null>(null);
  const [procedures, setProcedures] = useState<ProcedureMetier[]>([]);
  const [agentNom, setAgentNom] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Résoudre les params async
  useEffect(() => {
    params.then(({ slug: s }) => setSlug(s));
  }, [params]);

  // Charger le poste + ses procédures de type cessation
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/postes/${slug}/procedures?type=cessation`)
      .then((r) => r.json())
      .then((data) => {
        setPoste(data.poste);
        setProcedures(data.procedures);
      })
      .catch(() => setError("Impossible de charger les procédures."));
  }, [slug]);

  const handleDemarrer = async (procedure: ProcedureMetier) => {
    if (!poste) return;
    setStarting(procedure.id);
    setError(null);
    try {
      // Démarre la session (en ligne ou hors ligne) et navigue vers le wizard.
      await startProcedureSession({
        procedure,
        posteId: poste.id,
        posteSlug: poste.slug,
        agentNom: agentNom.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setStarting(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Retour */}
      <Link
        href={slug ? `/postes/${slug}` : "/postes"}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft size={16} />
        {poste?.nom ?? "Poste"}
      </Link>

      {/* En-tête */}
      <div className="bg-blue-900 text-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-800 rounded-xl">
            <ClipboardCheck size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cessation de service</h1>
            {poste && <p className="text-blue-300 text-sm mt-0.5">{poste.nom}</p>}
          </div>
        </div>
      </div>

      {/* Saisie agent */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
          <User size={16} className="text-slate-400" />
          Votre nom (optionnel)
        </label>
        <input
          type="text"
          value={agentNom}
          onChange={(e) => setAgentNom(e.target.value)}
          placeholder="Ex : Dupont Martin"
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Liste des procédures */}
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
                    ? "bg-blue-100 text-blue-400 cursor-not-allowed"
                    : "bg-blue-700 hover:bg-blue-800 text-white"
                }`}
              >
                {starting === proc.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Démarrage…
                  </>
                ) : (
                  <>
                    <ClipboardCheck size={16} />
                    Démarrer la procédure
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Aucune procédure de cessation configurée pour ce poste.
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
