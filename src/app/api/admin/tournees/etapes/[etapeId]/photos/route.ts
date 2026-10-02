import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import {
  PHOTO_ALLOWED_MIME,
  PHOTO_MAX_SIZE,
  documentFilename,
  ensureDocumentsDir,
  getDocumentPath,
} from "@/lib/documents";
import { guardModeleAdmin, userLabel } from "@/lib/tournee/http";

export const runtime = "nodejs";

type Params = { params: Promise<{ etapeId: string }> };

/** POST multipart — ajoute une photo illustrative à une étape de modèle. */
export async function POST(req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { etapeId } = await params;
  const etape = await prisma.tourneeEtape.findUnique({
    where: { id: etapeId },
    select: { id: true, modeleId: true, _count: { select: { photos: true } } },
  });
  if (!etape) return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!PHOTO_ALLOWED_MIME.includes(file.type as (typeof PHOTO_ALLOWED_MIME)[number])) {
    return NextResponse.json({ error: "Format non autorisé (JPEG ou PNG)" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  if (file.size > PHOTO_MAX_SIZE) return NextResponse.json({ error: "Photo trop volumineuse (max 8 Mo)" }, { status: 400 });
  const caption = typeof form?.get("caption") === "string" ? String(form.get("caption")).trim() || null : null;

  const doc = await prisma.document.create({
    data: {
      kind: "PHOTO",
      filename: "",
      originalName: file.name || "photo.jpg",
      mimeType: file.type,
      size: file.size,
      caption,
      ordre: etape._count.photos,
      tourneeEtapeId: etapeId,
      uploadedByUserId: g.user.id,
    },
  });
  await ensureDocumentsDir();
  await fs.writeFile(getDocumentPath(doc.id, file.type), Buffer.from(await file.arrayBuffer()));
  const saved = await prisma.document.update({
    where: { id: doc.id },
    data: { filename: documentFilename(doc.id, file.type) },
  });
  await prisma.tourneeModele.update({ where: { id: etape.modeleId }, data: { version: { increment: 1 } } });
  await logAdminAction(g.user.id, userLabel(g.user), "CREATE", "document", doc.id, `photo étape=${etapeId}`);
  return NextResponse.json(saved, { status: 201 });
}
