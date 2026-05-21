/**
 * Démarrage d'une session de procédure — partagé par les pages d'entrée
 * (/postes/[slug]/cessation et /postes/[slug]/procedures/[type]).
 *
 * Module client-only (utilise navigator, window, IndexedDB).
 */

import { enqueue, saveProcedureSession } from "@/lib/idb-offline";
import { initialiserEtatSession } from "@/lib/procedure/engine";
import type { ProcedureMetier, SessionProcedureMetier } from "@/lib/procedure/types";

export interface StartProcedureArgs {
  procedure: ProcedureMetier;
  posteId: string;
  posteSlug: string;
  agentNom?: string;
}

/**
 * Démarre une session de procédure puis navigue vers la page wizard.
 *
 * - En ligne : POST de création serveur → vrai identifiant.
 * - Hors ligne (ou échec réseau pur) : session locale `local-proc-<uuid>`
 *   persistée dans IndexedDB + op `proc-session-create` enfilée pour promotion
 *   au retour du réseau.
 *
 * La navigation utilise window.location.assign (chargement complet) : hors
 * ligne, c'est indispensable pour que le Service Worker serve la coquille de
 * page en cache — une navigation client Next.js déclencherait un fetch RSC
 * qui échouerait sans réseau.
 *
 * En cas de refus serveur (4xx/5xx en ligne), l'erreur est propagée à l'appelant.
 */
export async function startProcedureSession(args: StartProcedureArgs): Promise<void> {
  const { procedure, posteId, posteSlug, agentNom } = args;
  const clientOpId = crypto.randomUUID();

  // ── En ligne : création serveur directe ──
  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/procedures/${procedure.slug}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posteId, agentNom: agentNom || undefined, clientOpId }),
      });
      if (res.ok) {
        const { sessionId } = await res.json();
        window.location.assign(`/procedures/session/${sessionId}`);
        return;
      }
      // Refus serveur (procédure non associée, etc.) — pas de repli local.
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Erreur lors du démarrage de la procédure");
    } catch (err) {
      // TypeError = échec réseau pur (navigator.onLine peut mentir) → repli hors
      // ligne. Toute autre erreur (refus serveur) est propagée.
      if (!(err instanceof TypeError)) throw err;
    }
  }

  // ── Hors ligne : session locale ──
  const localId = `local-proc-${crypto.randomUUID()}`;
  const localSession: SessionProcedureMetier = {
    id: localId,
    procedureId: procedure.id,
    procedureVersion: procedure.version,
    procedureSnapshot: procedure,
    posteId,
    posteSlug,
    agentNom: agentNom || undefined,
    statut: "en_cours",
    etapeIndex: 0,
    etat: initialiserEtatSession(procedure),
    startedAt: new Date().toISOString(),
  };

  await saveProcedureSession(localSession);
  await enqueue({
    kind: "proc-session-create",
    sessionId: localId,
    procedureSlug: procedure.slug,
    posteId,
    agentNom: agentNom || undefined,
    createdAt: Date.now(),
    attempts: 0,
  });

  window.location.assign(`/procedures/session/${localId}`);
}
