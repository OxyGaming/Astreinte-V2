import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";
import { unlinkDocumentFile } from "@/lib/documents";

export const runtime = "nodejs";

interface Params { params: Promise<{ id: string }> }

/** PATCH — légende / ordre d'affichage (photos illustratives de tournée). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id }, select: { id: true } });
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { caption?: string | null; ordre?: number } = {};
  if ("caption" in body) data.caption = typeof body.caption === "string" && body.caption.trim() ? body.caption.trim() : null;
  if (Number.isInteger(body.ordre)) data.ordre = body.ordre;

  const updated = await prisma.document.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  await prisma.document.delete({ where: { id } });

  await unlinkDocumentFile(id, document.mimeType);

  await logAdminAction(
    user.id,
    `${user.prenom} ${user.nom}`,
    "DELETE",
    "document",
    id,
    document.originalName,
  );

  return NextResponse.json({ success: true });
}
