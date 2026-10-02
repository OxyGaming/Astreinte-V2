import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { PHOTO_ALLOWED_MIME, PHOTO_MAX_SIZE, documentFilename, ensureDocumentsDir, getDocumentPath } from "@/lib/documents";
import { guardUser, userLabel } from "@/lib/tournee/http";
import { loadRealisation, planOf, realisationAccess } from "@/lib/tournee/server";
import { isContributionType, MAX_PHOTOS_CONTRIBUTION } from "@/lib/tournee/contributions";

export const runtime = "nodejs";

/** GET — mes contributions. */
export async function GET() {
  const g = await guardUser();
  if (g.error) return g.error;
  const rows = await prisma.tourneeContribution.findMany({
    where: { auteurId: g.user.id },
    orderBy: { createdAt: "desc" },
    include: { realisation: { select: { titre: true, date: true } }, _count: { select: { photos: true } } },
  });
  return NextResponse.json(rows);
}

/**
 * POST multipart — contribution terrain :
 *   type, description, realisationId?, etapeKey?, clientOpId?, photos[] (JPEG/PNG)
 * Enregistrée comme objet indépendant ; ne modifie jamais le modèle.
 */
export async function POST(req: NextRequest) {
  const g = await guardUser();
  if (g.error) return g.error;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Requête multipart invalide" }, { status: 400 });

  const type = form.get("type");
  const description = String(form.get("description") ?? "").trim();
  const realisationId = String(form.get("realisationId") ?? "") || null;
  const etapeKey = String(form.get("etapeKey") ?? "") || null;
  const clientOpId = String(form.get("clientOpId") ?? "") || null;
  if (!isContributionType(type)) return NextResponse.json({ error: "Type de contribution invalide" }, { status: 400 });
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!description && photos.length === 0) return NextResponse.json({ error: "Décrivez la contribution ou joignez une photo" }, { status: 400 });
  if (description.length > 5000) return NextResponse.json({ error: "Description trop longue" }, { status: 400 });
  if (photos.length > MAX_PHOTOS_CONTRIBUTION) return NextResponse.json({ error: `${MAX_PHOTOS_CONTRIBUTION} photos maximum` }, { status: 400 });
  for (const p of photos) {
    if (!PHOTO_ALLOWED_MIME.includes(p.type as (typeof PHOTO_ALLOWED_MIME)[number])) return NextResponse.json({ error: "Photos JPEG ou PNG uniquement" }, { status: 400 });
    if (p.size > PHOTO_MAX_SIZE) return NextResponse.json({ error: "Photo trop volumineuse (max 8 Mo)" }, { status: 400 });
  }

  if (clientOpId) {
    const dup = await prisma.tourneeContribution.findUnique({ where: { clientOpId }, select: { id: true } });
    if (dup) return NextResponse.json(dup, { status: 200 });
  }

  // Rattachement à la réalisation (et à l'étape, titre figé) si fourni.
  let modeleId: string | null = null;
  let etapeTitre: string | null = null;
  if (realisationId) {
    const r = await loadRealisation(realisationId);
    if (!r) return NextResponse.json({ error: "Tournée introuvable" }, { status: 404 });
    if (!realisationAccess(g.user, r).participant) return NextResponse.json({ error: "Vous ne participez pas à cette tournée" }, { status: 403 });
    modeleId = r.modeleId;
    if (etapeKey) {
      const e = planOf(r)?.etapes.find((x) => x.key === etapeKey);
      if (!e) return NextResponse.json({ error: "Étape inconnue" }, { status: 400 });
      etapeTitre = e.titre;
    }
  }

  const contribution = await prisma.tourneeContribution.create({
    data: {
      realisationId,
      modeleId,
      etapeKey: etapeTitre ? etapeKey : null,
      etapeTitre,
      auteurId: g.user.id,
      type,
      description,
      clientOpId,
      historique: { create: { type: "CREATION", nouvelleValeur: "NOUVELLE", actorId: g.user.id, actorNom: userLabel(g.user) } },
    },
  });

  await ensureDocumentsDir();
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const doc = await prisma.document.create({
      data: {
        kind: "PHOTO",
        filename: documentFilename("tmp", p.type),
        originalName: p.name || `photo-${i + 1}.jpg`,
        mimeType: p.type,
        size: p.size,
        ordre: i,
        tourneeContributionId: contribution.id,
        uploadedByUserId: g.user.id,
      },
    });
    await fs.writeFile(getDocumentPath(doc.id, p.type), Buffer.from(await p.arrayBuffer()));
    await prisma.document.update({ where: { id: doc.id }, data: { filename: documentFilename(doc.id, p.type) } });
  }

  return NextResponse.json({ id: contribution.id }, { status: 201 });
}
