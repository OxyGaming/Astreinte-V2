import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

/**
 * Variante **transactionnelle** : écrit la trace via le client de transaction
 * fourni, et **laisse remonter** toute erreur (pas de try/catch). Réservée aux
 * opérations où l'audit doit être atomique avec l'action — typiquement les
 * suppressions du triangle : si l'audit échoue, la suppression doit être annulée.
 */
export async function logAdminActionTx(
  tx: Prisma.TransactionClient,
  userId: string,
  userLabel: string,
  action: AuditAction,
  resource: string,
  resourceId: string,
  detail?: string
): Promise<void> {
  await tx.adminAuditLog.create({
    data: { userId, userNom: userLabel, action, resource, resourceId, detail: detail ?? null },
  });
}

/**
 * Enregistre une action CRUD admin dans AdminAuditLog.
 * N'interrompt jamais l'opération principale en cas d'échec.
 */
export async function logAdminAction(
  userId: string,
  userLabel: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  resource: string,
  resourceId: string,
  detail?: string
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: { userId, userNom: userLabel, action, resource, resourceId, detail: detail ?? null },
    });
  } catch (err) {
    console.warn("[audit] Impossible d'écrire le log admin:", err);
  }
}
