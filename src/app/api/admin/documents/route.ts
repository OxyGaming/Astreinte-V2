import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";
import {
  DOCUMENT_ALLOWED_MIME,
  DOCUMENT_MAX_SIZE,
  ensureDocumentsDir,
  getDocumentPath,
} from "@/lib/documents";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Requête multipart invalide" }, { status: 400 });
  }

  const file = formData.get("file");
  const ficheId = (formData.get("ficheId") as string | null) || null;
  const posteId = (formData.get("posteId") as string | null) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!ficheId && !posteId) {
    return NextResponse.json({ error: "ficheId ou posteId requis" }, { status: 400 });
  }
  if (ficheId && posteId) {
    return NextResponse.json({ error: "Un document ne peut pas être lié à la fois à une fiche et à un poste" }, { status: 400 });
  }

  if (!DOCUMENT_ALLOWED_MIME.includes(file.type as (typeof DOCUMENT_ALLOWED_MIME)[number])) {
    return NextResponse.json({ error: "Type de fichier non autorisé (PDF uniquement)" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > DOCUMENT_MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  if (ficheId) {
    const fiche = await prisma.fiche.findUnique({ where: { id: ficheId }, select: { id: true } });
    if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
  }
  if (posteId) {
    const poste = await prisma.poste.findUnique({ where: { id: posteId }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
  }

  const document = await prisma.document.create({
    data: {
      filename: "",
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      ficheId,
      posteId,
      uploadedByUserId: user.id,
    },
  });

  await ensureDocumentsDir();
  const filePath = getDocumentPath(document.id);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const finalFilename = `${document.id}.pdf`;
  await prisma.document.update({ where: { id: document.id }, data: { filename: finalFilename } });

  await logAdminAction(
    user.id,
    `${user.prenom} ${user.nom}`,
    "CREATE",
    "document",
    document.id,
    `${file.name} (${file.size} octets) · ${ficheId ? `fiche=${ficheId}` : `poste=${posteId}`}`,
  );

  return NextResponse.json({ ...document, filename: finalFilename }, { status: 201 });
}
