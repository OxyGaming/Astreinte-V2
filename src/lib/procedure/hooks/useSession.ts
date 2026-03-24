"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SessionProcedureMetier,
  ValeurReponse,
  EtatSession,
  ProcedureMetier,
  Synthese,
} from "../types";

interface UseSessionReturn {
  session: SessionProcedureMetier | null;
  loading: boolean;
  error: string | null;
  repondre: (etapeId: string, actionId: string, valeur: ValeurReponse) => Promise<void>;
  avancer: (etapeIndex: number) => Promise<void>;
  abandonner: () => Promise<void>;
  completer: () => Promise<Synthese | null>;
}

export function useSession(sessionId: string): UseSessionReturn {
  const [session, setSession] = useState<SessionProcedureMetier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    fetch(`/api/procedures/sessions/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Session introuvable");
        return r.json();
      })
      .then((data) => {
        setSession(toSession(data));
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // ─── Enregistrement d'une réponse ─────────────────────────────────────────

  const repondre = useCallback(
    async (etapeId: string, actionId: string, valeur: ValeurReponse) => {
      // Optimistic update local
      setSession((prev) => {
        if (!prev) return prev;
        const etatEtape = prev.etat.etapes[etapeId] ?? {
          etapeId,
          statut: "en_cours" as const,
          reponses: {},
        };
        const nouvelEtat: EtatSession = {
          ...prev.etat,
          etapes: {
            ...prev.etat.etapes,
            [etapeId]: {
              ...etatEtape,
              statut: "en_cours",
              reponses: {
                ...etatEtape.reponses,
                [actionId]: { actionId, valeur, timestamp: new Date().toISOString() },
              },
            },
          },
        };
        return { ...prev, etat: nouvelEtat };
      });

      const res = await fetch(`/api/procedures/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repondre", etapeId, actionId, valeur }),
      });

      if (res.ok) {
        const data = await res.json();
        setSession(toSession(data));
      }
    },
    [sessionId]
  );

  // ─── Avancement d'étape ────────────────────────────────────────────────────

  const avancer = useCallback(
    async (etapeIndex: number) => {
      setSession((prev) => (prev ? { ...prev, etapeIndex } : prev));

      await fetch(`/api/procedures/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "avancer", etapeIndex }),
      });
    },
    [sessionId]
  );

  // ─── Abandon ──────────────────────────────────────────────────────────────

  const abandonner = useCallback(async () => {
    const res = await fetch(`/api/procedures/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abandonner" }),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(toSession(data));
    }
  }, [sessionId]);

  // ─── Clôture et calcul de synthèse ────────────────────────────────────────

  const completer = useCallback(async (): Promise<Synthese | null> => {
    const res = await fetch(`/api/procedures/sessions/${sessionId}/complete`, {
      method: "POST",
    });
    if (!res.ok) return null;
    const data = await res.json();
    setSession((prev) =>
      prev
        ? { ...prev, statut: "terminee", synthese: data.synthese, completedAt: data.completedAt }
        : prev
    );
    return data.synthese as Synthese;
  }, [sessionId]);

  return { session, loading, error, repondre, avancer, abandonner, completer };
}

// ─── Conversion API → runtime ─────────────────────────────────────────────────

function toSession(data: {
  id: string; procedureId: string; procedureVersion: string;
  procedureSnapshot: ProcedureMetier; posteId: string; posteSlug: string;
  agentNom?: string; statut: string; etapeIndex: number;
  etat: EtatSession; synthese?: Synthese;
  startedAt: string; completedAt?: string;
}): SessionProcedureMetier {
  return {
    id: data.id,
    procedureId: data.procedureId,
    procedureVersion: data.procedureVersion,
    procedureSnapshot: data.procedureSnapshot,
    posteId: data.posteId,
    posteSlug: data.posteSlug,
    agentNom: data.agentNom,
    statut: data.statut as SessionProcedureMetier["statut"],
    etapeIndex: data.etapeIndex,
    etat: data.etat,
    synthese: data.synthese,
    startedAt: data.startedAt,
    completedAt: data.completedAt,
  };
}
