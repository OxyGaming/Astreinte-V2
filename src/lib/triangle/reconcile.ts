/**
 * triangle/reconcile — cohérence en base du triangle **Session ↔ RCI ↔ Livret CIL**.
 *
 * Les trois côtés sont des FK directes (`Rci.sessionId`, `Rci.cilIncidentId`,
 * `CilIncident.sessionId`). Historiquement, chaque geste de création/rattachement
 * n'écrivait qu'UNE arête ; le résolveur transitif (`resolveTriangleLinks`)
 * compensait à la lecture, laissant les FK à moitié peuplées. Ce module referme
 * les arêtes déductibles **en base**, dans la transaction du geste, pour que
 * l'état stocké soit toujours cohérent — le résolveur transitif ne restant qu'une
 * sécurité de lecture.
 *
 * Règles :
 *  - on ne complète que ce qui est **déductible sans ambiguïté** ;
 *  - on ne **remplace jamais** une FK déjà occupée par un autre élément :
 *    un conflit lève `TriangleConflictError` (que les routes traduisent en 409) ;
 *  - la session est propagée le long des arêtes RCI↔Livret déjà existantes.
 *
 * Server-only (importe des types Prisma). À appeler dans une transaction.
 */
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient | PrismaClient;

/** Conflit de cohérence : une FK visée est déjà occupée par un AUTRE élément. */
export class TriangleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TriangleConflictError";
  }
}

/** Arête(s) que l'appelant vient d'établir (ids non nuls). */
export type TriangleAnchor = {
  rciId?: string | null;
  cilId?: string | null;
  sessionId?: string | null;
};

/**
 * Referme le triangle autour d'un élément fraîchement créé ou rattaché.
 *
 * `anchor` nomme l'arête que l'appelant vient de poser. On lit l'état courant des
 * entités concernées, on détecte les incohérences (sessions divergentes, arête
 * RCI↔Livret déjà prise par un autre), puis on écrit les FK manquantes déductibles.
 *
 * @throws TriangleConflictError si le triangle est incohérent ou qu'une FK visée
 *         est déjà occupée par un autre élément.
 */
export async function reconcileTriangle(
  tx: Tx,
  anchor: TriangleAnchor,
): Promise<void> {
  const rciId = anchor.rciId ?? null;
  const cilId = anchor.cilId ?? null;
  const sessionIdIn = anchor.sessionId ?? null;

  const rci = rciId
    ? await tx.rci.findUnique({
        where: { id: rciId },
        select: { id: true, sessionId: true, cilIncidentId: true },
      })
    : null;
  if (rciId && !rci) throw new TriangleConflictError("RCI introuvable");

  // Livret concerné : celui passé explicitement, sinon celui déjà lié au RCI.
  const effectiveCilId = cilId ?? rci?.cilIncidentId ?? null;
  const cil = effectiveCilId
    ? await tx.cilIncident.findUnique({
        where: { id: effectiveCilId },
        select: { id: true, sessionId: true },
      })
    : null;
  if (cilId && !cil) throw new TriangleConflictError("Livret CIL introuvable");

  // Arête RCI↔Livret : si les deux sont explicitement fournis et que le RCI
  // pointe déjà vers un AUTRE livret, c'est un conflit (pas d'écrasement).
  if (rci && cilId && rci.cilIncidentId && rci.cilIncidentId !== cilId) {
    throw new TriangleConflictError(
      "Ce RCI est déjà rattaché à un autre Livret CIL",
    );
  }

  // Session effective : union des sessions connues (anchor, RCI, Livret). Deux
  // sessions distinctes ⇒ triangle incohérent, on refuse plutôt que d'en choisir une.
  const sessions = new Set(
    [sessionIdIn, rci?.sessionId ?? null, cil?.sessionId ?? null].filter(
      (s): s is string => !!s,
    ),
  );
  if (sessions.size > 1) {
    throw new TriangleConflictError(
      "Sessions divergentes : ce triangle est déjà rattaché à une autre session",
    );
  }
  const effectiveSessionId = sessions.size === 1 ? [...sessions][0] : null;

  // ── Écritures des FK déductibles ────────────────────────────────────────────

  // 1) RCI → Livret : on relie le RCI au Livret explicitement fourni s'il n'a
  //    pas encore de source Livret.
  if (rci && cilId && rci.cilIncidentId == null) {
    await tx.rci.update({ where: { id: rci.id }, data: { cilIncidentId: cilId } });
  }

  // 2) RCI → Session.
  if (rci && effectiveSessionId) {
    if (rci.sessionId == null) {
      await tx.rci.update({
        where: { id: rci.id },
        data: { sessionId: effectiveSessionId },
      });
    } else if (rci.sessionId !== effectiveSessionId) {
      throw new TriangleConflictError(
        "Ce RCI est déjà rattaché à une autre session",
      );
    }
  }

  // 3) Livret → Session.
  if (cil && effectiveSessionId) {
    if (cil.sessionId == null) {
      await tx.cilIncident.update({
        where: { id: cil.id },
        data: { sessionId: effectiveSessionId },
      });
    } else if (cil.sessionId !== effectiveSessionId) {
      throw new TriangleConflictError(
        "Ce Livret CIL est déjà rattaché à une autre session",
      );
    }
  }

  // 4) Propagation de la session le long de l'arête RCI↔Livret : tous les RCI
  //    rattachés à ce Livret et encore sans session héritent de la session.
  //    (Décrivent le même événement : cohérent avec le modèle 1:1:1.)
  if (effectiveCilId && effectiveSessionId) {
    await tx.rci.updateMany({
      where: { cilIncidentId: effectiveCilId, sessionId: null },
      data: { sessionId: effectiveSessionId },
    });
  }

  // 5) Complétion RCI→Livret déductible depuis la session : si on tient un RCI
  //    sans Livret rattaché à une session qui n'a qu'UN SEUL Livret, on relie.
  if (rci && effectiveSessionId && rci.cilIncidentId == null && !effectiveCilId) {
    const cils = await tx.cilIncident.findMany({
      where: { sessionId: effectiveSessionId },
      select: { id: true },
      take: 2,
    });
    if (cils.length === 1) {
      await tx.rci.update({
        where: { id: rci.id },
        data: { cilIncidentId: cils[0].id },
      });
      logAutoLink(rci.id, cils[0].id, effectiveSessionId, "rci-anchor");
    }
  }

  // 6) Symétrique : on tient un Livret rattaché à une session qui possède
  //    exactement UN RCI encore sans Livret → on relie ce RCI au Livret.
  if (cil && effectiveSessionId) {
    const orphans = await tx.rci.findMany({
      where: { sessionId: effectiveSessionId, cilIncidentId: null },
      select: { id: true },
      take: 2,
    });
    if (orphans.length === 1) {
      await tx.rci.update({
        where: { id: orphans[0].id },
        data: { cilIncidentId: cil.id },
      });
      logAutoLink(orphans[0].id, cil.id, effectiveSessionId, "cil-anchor");
    }
  }
}

/**
 * Trace un rattachement RCI↔Livret **complété automatiquement** par déduction
 * (session à candidat unique). Permet de comprendre a posteriori comment un
 * triangle s'est constitué sans geste explicite de l'opérateur.
 */
function logAutoLink(
  rciId: string,
  cilId: string,
  sessionId: string | null,
  via: "rci-anchor" | "cil-anchor",
): void {
  console.info(
    `[triangle] auto-link RCI↔Livret complété : rci=${rciId} ↔ cil=${cilId}` +
      ` (session=${sessionId ?? "—"}, déduit via ${via})`,
  );
}
