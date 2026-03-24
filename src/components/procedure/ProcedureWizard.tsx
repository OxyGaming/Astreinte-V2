"use client";

import { useState, useCallback } from "react";
import { useSession } from "@/lib/procedure/hooks/useSession";
import { etapesVisibles } from "@/lib/procedure/engine";
import type { ValeurReponse } from "@/lib/procedure/types";
import EtapeRenderer from "./EtapeRenderer";
import ProcedureSummary from "./ProcedureSummary";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface Props {
  sessionId: string;
  /** Map contactId → telephone (résolu côté serveur, passé en prop) */
  contactsIndex: Record<string, string>;
}

export default function ProcedureWizard({ sessionId, contactsIndex }: Props) {
  const { session, loading, error, repondre, avancer, abandonner, completer } =
    useSession(sessionId);
  const [synthese, setSynthese] = useState<ReturnType<typeof completer> extends Promise<infer T> ? T : never>(null);
  const [completing, setCompleting] = useState(false);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleRepondre = useCallback(
    (actionId: string, valeur: ValeurReponse) => {
      if (!session) return;
      const etape = etapesVisibles(session.procedureSnapshot, session.etat)[session.etapeIndex];
      if (!etape) return;
      repondre(etape.id, actionId, valeur);
    },
    [session, repondre]
  );

  const handleSuivant = useCallback(() => {
    if (!session) return;
    const newIndex = session.etapeIndex + 1;
    avancer(newIndex);
  }, [session, avancer]);

  const handlePrecedent = useCallback(() => {
    if (!session) return;
    const newIndex = Math.max(0, session.etapeIndex - 1);
    avancer(newIndex);
  }, [session, avancer]);

  const handleTerminer = useCallback(async () => {
    setCompleting(true);
    const s = await completer();
    setSynthese(s);
    setCompleting(false);
  }, [completer]);

  // ─── États de chargement ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 font-medium">{error ?? "Session introuvable"}</p>
      </div>
    );
  }

  // ─── Synthèse finale ───────────────────────────────────────────────────────

  const syntheseAffichee = synthese ?? session.synthese;
  if (syntheseAffichee && session.statut === "terminee") {
    return (
      <ProcedureSummary
        synthese={syntheseAffichee}
        procedureTitre={session.procedureSnapshot.titre}
        posteSlug={session.posteSlug}
        agentNom={session.agentNom}
        completedAt={session.completedAt}
      />
    );
  }

  // ─── Wizard ───────────────────────────────────────────────────────────────

  const procedure = session.procedureSnapshot;
  const etapes = etapesVisibles(procedure, session.etat);
  const etapeEnCours = etapes[session.etapeIndex] ?? etapes[0];

  if (!etapeEnCours) {
    return <p className="text-slate-500 text-center py-10">Aucune étape disponible.</p>;
  }

  const estDerniere = session.etapeIndex === etapes.length - 1;

  return (
    <div className="space-y-6">
      {/* En-tête procédure */}
      <div className="bg-blue-900 text-white rounded-2xl p-4">
        <p className="text-xs text-blue-300 font-medium uppercase tracking-wide mb-0.5">
          {procedure.typeProcedure}
        </p>
        <h1 className="text-lg font-bold">{procedure.titre}</h1>
        {session.agentNom && (
          <p className="text-blue-300 text-sm mt-1">Agent : {session.agentNom}</p>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {etapes.map((etape, i) => {
          const estActive = i === session.etapeIndex;
          const estComplete = i < session.etapeIndex;

          return (
            <div key={etape.id} className="flex items-center flex-shrink-0">
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
                  estActive
                    ? "bg-blue-700 text-white"
                    : estComplete
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {estComplete ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Circle size={12} />
                )}
                <span className="whitespace-nowrap">{etape.titre}</span>
              </div>
              {i < etapes.length - 1 && (
                <div className={`w-4 h-0.5 flex-shrink-0 ${estComplete ? "bg-green-300" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Étape en cours */}
      {completing ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={24} className="animate-spin text-green-600" />
          <span className="ml-2 text-sm text-slate-600">Calcul de la synthèse…</span>
        </div>
      ) : (
        <EtapeRenderer
          etape={etapeEnCours}
          etatEtape={session.etat.etapes[etapeEnCours.id]}
          etat={session.etat}
          estDerniere={estDerniere}
          onRepondre={handleRepondre}
          onSuivant={handleSuivant}
          onPrecedent={handlePrecedent}
          onTerminer={handleTerminer}
          contactsIndex={contactsIndex}
        />
      )}
    </div>
  );
}
