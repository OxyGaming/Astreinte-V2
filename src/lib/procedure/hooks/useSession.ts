"use client";

/**
 * useSession — état + mutations d'une session de procédure, compatible hors ligne.
 *
 * Stratégie (calquée sur FicheSessionView) :
 * - L'état complet de la session est persisté dans IndexedDB à chaque mutation
 *   (`procedure_sessions`) → le wizard fonctionne et survit à un rechargement
 *   même sans réseau.
 * - Les mutations effectuées hors ligne sont enfilées (`pending_ops`) et rejouées
 *   au retour du réseau (drainQueue).
 * - Le moteur (`engine.ts`) étant pur, les réponses et la synthèse sont calculées
 *   localement à l'identique du serveur.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { enregistrerReponse, calculerSynthese } from "../engine";
import type {
  SessionProcedureMetier,
  ValeurReponse,
  EtatSession,
  ProcedureMetier,
  Synthese,
} from "../types";
import {
  enqueue,
  getBySession,
  remove as removeOp,
  update as updateOp,
  remapSessionId,
  saveProcedureSession,
  getProcedureSession,
  deleteProcedureSession,
  remapProcedureSession,
  type PendingOp,
} from "@/lib/idb-offline";

interface UseSessionReturn {
  session: SessionProcedureMetier | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  pendingCount: number;
  repondre: (etapeId: string, actionId: string, valeur: ValeurReponse) => Promise<void>;
  avancer: (etapeIndex: number) => Promise<void>;
  abandonner: () => Promise<void>;
  completer: () => Promise<Synthese | null>;
}

/** Une session locale (créée hors ligne) porte un id préfixé `local-proc-`. */
function isLocalProcId(id: string): boolean {
  return id.startsWith("local-proc-");
}

// Verrou module-scope partagé par toutes les instances : empêche deux drains
// concurrents de la même session (remount, Strict Mode, HMR). Cf. FicheSessionView.
const moduleDrainLocks = new Set<string>();

export function useSession(sessionId: string): UseSessionReturn {
  const [session, setSession] = useState<SessionProcedureMetier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Ref miroir : les mutations lisent l'état le plus frais sans dépendre du
  // batching de setState (clics successifs rapides).
  const sessionRef = useRef<SessionProcedureMetier | null>(null);

  const applySession = useCallback((next: SessionProcedureMetier) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  /** Met à jour l'état (mémoire + ref) et le persiste dans IndexedDB. */
  const persist = useCallback(
    async (next: SessionProcedureMetier) => {
      applySession(next);
      try {
        await saveProcedureSession(next);
      } catch {
        // IndexedDB indisponible — l'état mémoire reste utilisable.
      }
    },
    [applySession]
  );

  const refreshPending = useCallback(async (id: string) => {
    try {
      const ops = await getBySession(id);
      setPendingCount(ops.length);
    } catch {
      /* IDB indisponible — silencieux */
    }
  }, []);

  // ─── État réseau ────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ─── Chargement initial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId || sessionId === "__shell__") {
      setError("Session introuvable");
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Session locale : uniquement le cache IndexedDB.
      if (isLocalProcId(sessionId)) {
        const local = await getProcedureSession(sessionId).catch(() => null);
        if (cancelled) return;
        if (local) {
          applySession(local);
          setError(null);
        } else {
          setError("Session introuvable");
        }
        setLoading(false);
        return;
      }

      // Session serveur : réseau d'abord si en ligne.
      if (navigator.onLine) {
        try {
          const r = await fetch(`/api/procedures/sessions/${sessionId}`);
          if (r.ok) {
            const s = toSession(await r.json());
            if (cancelled) return;
            applySession(s);
            setError(null);
            setLoading(false);
            saveProcedureSession(s).catch(() => {});
            return;
          }
          // Réponse non OK (404…) — on tente le cache local avant d'abandonner.
        } catch {
          // Erreur réseau — repli sur le cache local.
        }
      }

      // Hors ligne / réseau KO : cache IndexedDB.
      const cached = await getProcedureSession(sessionId).catch(() => null);
      if (cancelled) return;
      if (cached) {
        applySession(cached);
        setError(null);
      } else {
        setError("Session introuvable");
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, applySession]);

  // ─── Drain de la file d'attente ─────────────────────────────────────────────
  //
  // - 2xx : op appliquée → retirée.
  // - 4xx : rejet définitif (ex: 409 session clôturée) → retirée pour ne pas bloquer.
  // - 5xx / exception réseau : attempts++ et on s'arrête (retry au prochain online).
  //
  // Cas spécial proc-session-create : promotion de la session locale auprès du
  // serveur EN PREMIER, remap des ops dépendantes + de l'URL, puis drain normal.
  const drainQueue = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    const initialLockKey = current.id;
    if (moduleDrainLocks.has(initialLockKey)) return;
    moduleDrainLocks.add(initialLockKey);

    let currentId = current.id;

    try {
      let ops: PendingOp[];
      try {
        ops = await getBySession(currentId);
      } catch {
        return;
      }
      if (ops.length === 0) return;

      // 1) Promotion de la session locale (si présente).
      const createOp = ops.find((o) => o.kind === "proc-session-create");
      if (createOp && createOp.id !== undefined && createOp.kind === "proc-session-create") {
        try {
          const res = await fetch(`/api/procedures/${createOp.procedureSlug}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              posteId: createOp.posteId,
              agentNom: createOp.agentNom,
              clientOpId: createOp.clientOpId,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const realId: string = data.sessionId;
            await remapSessionId(currentId, realId);
            await remapProcedureSession(currentId, realId);
            await removeOp(createOp.id);
            moduleDrainLocks.add(realId);
            // L'URL doit pointer le vrai id pour qu'un rechargement retrouve la session.
            try {
              window.history.replaceState(null, "", `/procedures/session/${realId}`);
            } catch {
              /* contexte sans history — ignoré */
            }
            currentId = realId;
            try {
              ops = await getBySession(realId);
            } catch {
              ops = [];
            }
          } else if (res.status >= 400 && res.status < 500) {
            // Le serveur refuse la création — on abandonne la session locale.
            await removeOp(createOp.id);
            await deleteProcedureSession(currentId);
            ops = [];
          } else {
            await updateOp({ ...createOp, attempts: createOp.attempts + 1, lastError: `HTTP ${res.status}` });
            return;
          }
        } catch (err) {
          await updateOp({ ...createOp, attempts: createOp.attempts + 1, lastError: String(err) });
          return;
        }
      }

      // 2) Drain des mutations dépendantes, dans l'ordre d'enfilement.
      for (const op of ops) {
        if (op.id === undefined) continue;
        try {
          let res: Response;
          if (op.kind === "proc-reponse") {
            res = await fetch(`/api/procedures/sessions/${currentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "repondre", ...op.payload }),
            });
          } else if (op.kind === "proc-avancer") {
            res = await fetch(`/api/procedures/sessions/${currentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "avancer", etapeIndex: op.payload.etapeIndex }),
            });
          } else if (op.kind === "proc-complete") {
            res = await fetch(`/api/procedures/sessions/${currentId}/complete`, { method: "POST" });
          } else if (op.kind === "proc-abandonner") {
            res = await fetch(`/api/procedures/sessions/${currentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "abandonner" }),
            });
          } else {
            continue; // op étrangère (fiche / main courante) — ignorée
          }

          if (res.ok || (res.status >= 400 && res.status < 500)) {
            await removeOp(op.id);
          } else {
            await updateOp({ ...op, attempts: op.attempts + 1, lastError: `HTTP ${res.status}` });
            break;
          }
        } catch (err) {
          await updateOp({ ...op, attempts: op.attempts + 1, lastError: String(err) });
          break;
        }
      }

      // 3) Rafraîchir l'état depuis le serveur (source de vérité après drain).
      try {
        const r = await fetch(`/api/procedures/sessions/${currentId}`);
        if (r.ok) {
          const s = toSession(await r.json());
          applySession(s);
          await saveProcedureSession(s);
        }
      } catch {
        /* réseau KO — l'état local reste valable */
      }
    } finally {
      try {
        const remaining = await getBySession(currentId);
        setPendingCount(remaining.length);
      } catch {
        /* ignoré */
      }
      moduleDrainLocks.delete(initialLockKey);
      moduleDrainLocks.delete(currentId);
    }
  }, [applySession]);

  // Au montage / changement de session : compteur + drain si en ligne.
  useEffect(() => {
    if (!session) return;
    refreshPending(session.id);
    if (navigator.onLine) drainQueue();
  }, [session, drainQueue, refreshPending]);

  // Drain au retour réseau.
  useEffect(() => {
    const onOnline = () => drainQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [drainQueue]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const repondre = useCallback(
    async (etapeId: string, actionId: string, valeur: ValeurReponse) => {
      const current = sessionRef.current;
      if (!current || current.statut !== "en_cours") return;

      // Application locale via le moteur pur (identique au serveur).
      const nouvelEtat: EtatSession = enregistrerReponse(current.etat, etapeId, actionId, valeur);
      const next: SessionProcedureMetier = { ...current, etat: nouvelEtat };
      await persist(next);

      if (navigator.onLine && !isLocalProcId(next.id)) {
        try {
          const res = await fetch(`/api/procedures/sessions/${next.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "repondre", etapeId, actionId, valeur }),
          });
          if (res.ok) {
            await persist(toSession(await res.json()));
            return;
          }
        } catch {
          /* réseau KO — on enfile ci-dessous */
        }
      }
      // Hors ligne / session locale / échec : enfiler pour rejeu.
      await enqueue({
        kind: "proc-reponse",
        sessionId: next.id,
        payload: { etapeId, actionId, valeur },
        createdAt: Date.now(),
        attempts: 0,
      });
      await refreshPending(next.id);
    },
    [persist, refreshPending]
  );

  const avancer = useCallback(
    async (etapeIndex: number) => {
      const current = sessionRef.current;
      if (!current || current.statut !== "en_cours") return;
      const next: SessionProcedureMetier = { ...current, etapeIndex };
      await persist(next);

      if (navigator.onLine && !isLocalProcId(next.id)) {
        try {
          const res = await fetch(`/api/procedures/sessions/${next.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "avancer", etapeIndex }),
          });
          if (res.ok) {
            await persist(toSession(await res.json()));
            return;
          }
        } catch {
          /* réseau KO — on enfile */
        }
      }
      await enqueue({
        kind: "proc-avancer",
        sessionId: next.id,
        payload: { etapeIndex },
        createdAt: Date.now(),
        attempts: 0,
      });
      await refreshPending(next.id);
    },
    [persist, refreshPending]
  );

  const abandonner = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || current.statut !== "en_cours") return;

    if (navigator.onLine && !isLocalProcId(current.id)) {
      try {
        const res = await fetch(`/api/procedures/sessions/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abandonner" }),
        });
        if (res.ok) {
          await persist(toSession(await res.json()));
          return;
        }
      } catch {
        /* réseau KO — on enfile */
      }
    }
    const next: SessionProcedureMetier = {
      ...current,
      statut: "abandonnee",
      completedAt: new Date().toISOString(),
    };
    await persist(next);
    await enqueue({
      kind: "proc-abandonner",
      sessionId: next.id,
      createdAt: Date.now(),
      attempts: 0,
    });
    await refreshPending(next.id);
  }, [persist, refreshPending]);

  const completer = useCallback(async (): Promise<Synthese | null> => {
    const current = sessionRef.current;
    if (!current) return null;

    if (navigator.onLine && !isLocalProcId(current.id)) {
      try {
        const res = await fetch(`/api/procedures/sessions/${current.id}/complete`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          await persist({
            ...current,
            statut: "terminee",
            synthese: data.synthese,
            completedAt: data.completedAt,
          });
          return data.synthese as Synthese;
        }
        if (res.status === 409) {
          // Déjà clôturée côté serveur — on recharge l'état réel.
          const r = await fetch(`/api/procedures/sessions/${current.id}`);
          if (r.ok) {
            const s = toSession(await r.json());
            await persist(s);
            return s.synthese ?? null;
          }
        }
      } catch {
        /* réseau KO — clôture locale ci-dessous */
      }
    }

    // Hors ligne / session locale / échec : synthèse calculée localement,
    // op enfilée. Le serveur recalculera la même synthèse au rejeu.
    const synthese = calculerSynthese(current.procedureSnapshot, current.etat);
    const next: SessionProcedureMetier = {
      ...current,
      statut: "terminee",
      synthese,
      completedAt: new Date().toISOString(),
    };
    await persist(next);
    await enqueue({
      kind: "proc-complete",
      sessionId: next.id,
      createdAt: Date.now(),
      attempts: 0,
    });
    await refreshPending(next.id);
    return synthese;
  }, [persist, refreshPending]);

  return { session, loading, error, isOffline, pendingCount, repondre, avancer, abandonner, completer };
}

// ─── Conversion API → runtime ─────────────────────────────────────────────────

function toSession(data: {
  id: string;
  procedureId: string;
  procedureVersion: string;
  procedureSnapshot: ProcedureMetier;
  posteId: string;
  posteSlug: string;
  agentNom?: string;
  statut: string;
  etapeIndex: number;
  etat: EtatSession;
  synthese?: Synthese;
  startedAt: string;
  completedAt?: string;
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
