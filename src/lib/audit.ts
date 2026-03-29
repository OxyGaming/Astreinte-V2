import { prisma } from "./prisma";

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
