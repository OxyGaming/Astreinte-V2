"use client";
import { useState, useCallback } from "react";
import { X, Eye, AlertTriangle } from "lucide-react";
import type { ProcedureForm } from "@/lib/procedure/form-types";
import { formToMetier } from "@/lib/procedure/form-types";
import { initialiserEtatSession, enregistrerReponse, etapesVisibles, actionsVisibles, etapeFranchissable } from "@/lib/procedure/engine";
import type { EtatSession, ValeurReponse } from "@/lib/procedure/types";
import ActionRenderer from "@/components/procedure/ActionRenderer";
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  form: ProcedureForm;
  onClose: () => void;
}

export default function PreviewModal({ form, onClose }: Props) {
  const procedure = formToMetier(form);
  const [etat, setEtat] = useState<EtatSession>(() => initialiserEtatSession(procedure));
  const [etapeIndex, setEtapeIndex] = useState(0);

  const etapes = etapesVisibles(procedure, etat);
  const etapeCourante = etapes[etapeIndex] ?? etapes[0];
  const estDerniere = etapeIndex === etapes.length - 1;

  const handleRepondre = useCallback((actionId: string, valeur: ValeurReponse) => {
    if (!etapeCourante) return;
    setEtat((prev) => enregistrerReponse(prev, etapeCourante.id, actionId, valeur));
  }, [etapeCourante]);

  if (!etapeCourante) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-gray-500">Aucune étape configurée — ajoutez des étapes pour prévisualiser.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm">Fermer</button>
        </div>
      </div>
    );
  }

  const etatEtape = etat.etapes[etapeCourante.id];
  const { ok, actionsBloques } = etapeFranchissable(etapeCourante, etat);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
        {/* Banner non-persistant */}
        <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-2.5">
          <div className="flex items-center gap-2 text-amber-700">
            <Eye size={14} />
            <span className="text-xs font-semibold">MODE APERÇU — Les réponses ne sont pas enregistrées</span>
          </div>
          <button onClick={onClose} className="p-1 text-amber-500 hover:text-amber-700">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-5">
          {/* En-tête procédure */}
          <div className="bg-blue-900 text-white rounded-xl p-4">
            <p className="text-xs text-blue-300 uppercase font-medium tracking-wide mb-0.5">{procedure.typeProcedure}</p>
            <h1 className="text-base font-bold">{procedure.titre || "Sans titre"}</h1>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {etapes.map((etape, i) => {
              const estActive = i === etapeIndex;
              const estComplete = i < etapeIndex;
              return (
                <div key={etape.id} className="flex items-center flex-shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${estActive ? "bg-blue-700 text-white" : estComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {estComplete ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    <span className="whitespace-nowrap">{etape.titre}</span>
                  </div>
                  {i < etapes.length - 1 && <div className={`w-3 h-0.5 ${estComplete ? "bg-green-300" : "bg-gray-200"}`} />}
                </div>
              );
            })}
          </div>

          {/* Étape en cours */}
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">{etapeCourante.titre}</h2>
            {etapeCourante.description && <p className="text-sm text-slate-500 mb-3">{etapeCourante.description}</p>}
            <div className="space-y-3">
              {actionsVisibles(etapeCourante, etat).map((action) => {
                const valeur = etatEtape?.reponses[action.id]?.valeur ?? null;
                const estBloque = actionsBloques.includes(action.id);
                return (
                  <div key={action.id} className={`rounded-xl border bg-white p-4 ${estBloque ? "border-red-300 ring-1 ring-red-200" : "border-slate-200"}`}>
                    <ActionRenderer
                      action={action}
                      valeur={valeur}
                      onChange={(v) => handleRepondre(action.id, v)}
                      contactTelephone={undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {!ok && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">{actionsBloques.length} action{actionsBloques.length > 1 ? "s" : ""} en attente ou bloquante{actionsBloques.length > 1 ? "s" : ""}.</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t border-gray-100 px-4 py-3 flex gap-3">
          <button
            onClick={() => setEtapeIndex((i) => Math.max(0, i - 1))}
            disabled={etapeIndex === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft size={15} /> Précédent
          </button>
          {estDerniere ? (
            <button
              disabled={!ok}
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${ok ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Fin de l&apos;aperçu
            </button>
          ) : (
            <button
              onClick={() => setEtapeIndex((i) => Math.min(etapes.length - 1, i + 1))}
              disabled={!ok}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold ${ok ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Suivant <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
