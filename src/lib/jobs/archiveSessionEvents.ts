/**
 * Job d'archivage des événements de sessions procédures.
 *
 * Stratégie :
 *   - Déplace les événements des sessions terminées (>= RETENTION_DAYS)
 *     de SessionProcedureEvent vers SessionProcedureEventArchive.
 *   - Opère par session, en transaction atomique.
 *   - eventsArchived = true uniquement si aucun événement actif ne subsiste
 *     après la suppression (garantie de cohérence du flag).
 *   - Idempotent : une relance après crash est sans risque.
 */

import { prisma } from "@/lib/prisma";

// ─── Configuration ────────────────────────────────────────────────────────────

export const RETENTION_DAYS = 90;
const BATCH_SIZE = 50;
// Pause entre transactions pour relâcher le writer SQLite entre sessions.
// Mis à 0 en environnement de test pour éviter les délais artificiels.
const PAUSE_MS = process.env.NODE_ENV === "test" ? 0 : 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArchiveOutcome = "archived" | "partial" | "skipped";

export interface BatchResult {
  processed: number; // sessions archivées complètement
  partial: number;   // sessions avec événements résiduels (reprise au prochain batch)
  errors: number;    // sessions en erreur
  sessions: Array<{ id: string; outcome: ArchiveOutcome | "error"; error?: string }>;
}

// ─── Batch principal ──────────────────────────────────────────────────────────

export async function runArchiveBatch(): Promise<BatchResult> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  const result: BatchResult = { processed: 0, partial: 0, errors: 0, sessions: [] };

  const eligibleSessions = await prisma.sessionProcedure.findMany({
    where: {
      eventsArchived: false,
      statut: { in: ["terminee", "abandonnee"] },
      completedAt: { lt: cutoff },
    },
    take: BATCH_SIZE,
    orderBy: { completedAt: "asc" }, // les plus anciennes en premier
    select: { id: true },
  });

  console.log(`[archive:batch] ${eligibleSessions.length} session(s) éligible(s) trouvée(s).`);

  for (const { id } of eligibleSessions) {
    try {
      const outcome = await archiveSingleSession(id);
      result.sessions.push({ id, outcome });

      switch (outcome) {
        case "archived":
          result.processed++;
          console.log(`[archive:session] ✓ ${id} — archivée complètement.`);
          break;
        case "partial":
          result.partial++;
          console.warn(
            `[archive:session] ⚠ ${id} — archivage partiel : événements résiduels détectés. ` +
            `Le flag reste false. Reprise prévue au prochain batch.`
          );
          break;
        case "skipped":
          console.log(`[archive:session] — ${id} — ignorée (déjà archivée ou introuvable).`);
          break;
      }
    } catch (err) {
      result.errors++;
      const message = err instanceof Error ? err.message : String(err);
      result.sessions.push({ id, outcome: "error", error: message });
      console.error(`[archive:session] ✗ ${id} — erreur non gérée :`, message);
      // On continue avec les sessions suivantes — pas de rollback global.
    }

    if (PAUSE_MS > 0) await new Promise<void>(r => setTimeout(r, PAUSE_MS));
  }

  console.log(
    `[archive:batch] Terminé — ` +
    `Archivées : ${result.processed}, ` +
    `Partielles : ${result.partial}, ` +
    `Erreurs : ${result.errors}.`
  );

  return result;
}

// ─── Archivage d'une session ──────────────────────────────────────────────────

export async function archiveSingleSession(sessionId: string): Promise<ArchiveOutcome> {
  // 1. Guard idempotence — lecture fraîche avant de commencer.
  //    Si la session a déjà été archivée (par une passe précédente ou un job concurrent),
  //    on sort immédiatement sans toucher à la base.
  const session = await prisma.sessionProcedure.findUnique({
    where: { id: sessionId },
    select: { eventsArchived: true },
  });

  if (!session || session.eventsArchived) {
    return "skipped";
  }

  // 2. Snapshot de la liste close.
  //    Les IDs collectés ici sont la seule liste que cette passe est autorisée
  //    à supprimer. Tout événement écrit après ce point ne sera pas touché.
  const events = await prisma.sessionProcedureEvent.findMany({
    where: { sessionId },
    orderBy: { sequence: "asc" },
  });
  const eventIds = events.map(e => e.id); // liste immuable pour cette passe

  // 3. Session sans événements : le flag peut être posé directement, hors transaction.
  if (events.length === 0) {
    await prisma.sessionProcedure.update({
      where: { id: sessionId },
      data: { eventsArchived: true, eventsArchivedAt: new Date() },
    });
    return "archived";
  }

  // 4. Transaction atomique :
  //    copie idempotente → suppression sur liste close → count résiduel → flag conditionnel.
  let outcome: ArchiveOutcome = "partial";

  await prisma.$transaction(async (tx) => {
    // 4a. Copie vers l'archive — idempotente grâce à skipDuplicates.
    //     Une relance après crash entre cette étape et la suivante est sûre.
    await tx.sessionProcedureEventArchive.createMany({
      data: events.map(e => ({
        id:         e.id,
        sessionId:  e.sessionId,
        sequence:   e.sequence,
        type:       e.type,
        etapeId:    e.etapeId,
        actionId:   e.actionId,
        valeur:     e.valeur,
        payload:    e.payload,
        actorNom:   e.actorNom,
        occurredAt: e.occurredAt,
        archivedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    // 4b. Suppression sur les IDs de la liste close uniquement.
    //     Un événement arrivé après l'étape 2 ne sera pas supprimé.
    await tx.sessionProcedureEvent.deleteMany({
      where: { id: { in: eventIds } },
    });

    // 4c. Décompte des événements actifs restants, dans la même transaction.
    //     SQLite mono-writer garantit qu'aucune écriture extérieure ne peut
    //     interférer entre le deleteMany et ce count.
    const remainingCount = await tx.sessionProcedureEvent.count({
      where: { sessionId },
    });

    // 4d. Le flag n'est posé que si la table active est vide pour cette session.
    //     Si remainingCount > 0 : des événements résiduels existent, le flag
    //     reste false et la session sera retraitée au prochain batch.
    if (remainingCount === 0) {
      await tx.sessionProcedure.update({
        where: { id: sessionId },
        data: { eventsArchived: true, eventsArchivedAt: new Date() },
      });
      outcome = "archived";
    }
    // outcome reste "partial" si remainingCount > 0
  });

  return outcome;
}
