import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/**
 * Remplace l'ensemble des liens d'une fiche.
 * Auto-bidirectionnel : pour chaque cible, on insère A→B et B→A en transaction,
 * et on supprime symétriquement les liens retirés.
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id: sourceId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.cibleIds)) {
    return NextResponse.json({ error: "Format invalide — cibleIds requis (tableau)" }, { status: 400 });
  }
  const cibleIds: string[] = body.cibleIds.filter((v: unknown): v is string => typeof v === "string");

  if (cibleIds.includes(sourceId)) {
    return NextResponse.json({ error: "Une fiche ne peut pas être liée à elle-même" }, { status: 400 });
  }

  const source = await prisma.fiche.findUnique({ where: { id: sourceId }, select: { id: true, titre: true } });
  if (!source) return NextResponse.json({ error: "Fiche source introuvable" }, { status: 404 });

  if (cibleIds.length > 0) {
    const existing = await prisma.fiche.findMany({
      where: { id: { in: cibleIds } },
      select: { id: true },
    });
    if (existing.length !== cibleIds.length) {
      return NextResponse.json({ error: "Une ou plusieurs fiches cibles introuvables" }, { status: 400 });
    }
  }

  await prisma.$transaction(async (tx) => {
    // Supprime tous les liens existants (dans les deux sens) impliquant la source
    await tx.ficheLien.deleteMany({
      where: {
        OR: [{ ficheSourceId: sourceId }, { ficheCibleId: sourceId }],
      },
    });

    // Recrée les liens bidirectionnels
    if (cibleIds.length > 0) {
      const data = cibleIds.flatMap((cibleId) => [
        { ficheSourceId: sourceId, ficheCibleId: cibleId },
        { ficheSourceId: cibleId, ficheCibleId: sourceId },
      ]);
      await tx.ficheLien.createMany({ data });
    }
  });

  await logAdminAction(
    user.id,
    `${user.prenom} ${user.nom}`,
    "UPDATE",
    "fiche-liens",
    sourceId,
    `${cibleIds.length} lien(s) — cibles: ${cibleIds.join(", ") || "(aucune)"}`,
  );

  return NextResponse.json({ success: true, count: cibleIds.length });
}
