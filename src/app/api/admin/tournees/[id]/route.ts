import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { unlinkDocumentFile } from "@/lib/documents";
import { guardModeleAdmin, userLabel } from "@/lib/tournee/http";
import { toAPropos, toContacts, toSeuils } from "@/lib/tournee/parse";
import { isValidHHmm } from "@/lib/tournee/time";

type Params = { params: Promise<{ id: string }> };

const STATUTS = ["BROUILLON", "PUBLIE", "ARCHIVE"];
const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function GET(_req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const modele = await prisma.tourneeModele.findUnique({
    where: { id },
    include: { etapes: { orderBy: { ordre: "asc" }, include: { photos: { orderBy: { ordre: "asc" } } } } },
  });
  if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  return NextResponse.json(modele);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const existing = await prisma.tourneeModele.findUnique({ where: { id }, select: { id: true, statut: true } });
  if (!existing) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const titre = opt(body.titre);
  if (!titre) return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });
  if (!isValidHHmm(body.heureDepart)) {
    return NextResponse.json({ error: "Heure de départ invalide (HH:mm)" }, { status: 400 });
  }
  const statut = STATUTS.includes(body.statut) ? body.statut : existing.statut;
  const seuils = toSeuils(body.seuils);
  if (seuils.rougeMin <= seuils.toleranceMin) {
    return NextResponse.json({ error: "Le seuil rouge doit être supérieur à la tolérance" }, { status: 400 });
  }

  if (statut === "PUBLIE") {
    const nbObligatoires = await prisma.tourneeEtape.count({ where: { modeleId: id, optionnelle: false } });
    if (nbObligatoires === 0) {
      return NextResponse.json({ error: "Impossible de publier un modèle sans étape obligatoire" }, { status: 400 });
    }
  }

  const modele = await prisma.tourneeModele.update({
    where: { id },
    data: {
      titre,
      sousTitre: opt(body.sousTitre),
      description: opt(body.description),
      objectif: opt(body.objectif),
      heureDepart: body.heureDepart.trim(),
      mentionDiffusion: opt(body.mentionDiffusion),
      seuils: JSON.stringify(seuils),
      aPropos: JSON.stringify(toAPropos(body.aPropos)),
      contacts: JSON.stringify(toContacts(body.contacts)),
      statut,
      version: { increment: 1 },
    },
  });
  await logAdminAction(g.user.id, userLabel(g.user), "UPDATE", "tournee-modele", id, `${titre} · ${statut}`);
  revalidatePath("/tournees");
  return NextResponse.json(modele);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const modele = await prisma.tourneeModele.findUnique({
    where: { id },
    include: { etapes: { include: { photos: { select: { id: true, mimeType: true } } } } },
  });
  if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });

  // Les réalisations conservent leur copie figée (modeleId → NULL) ; les photos
  // d'étape partent avec le modèle.
  const photos = modele.etapes.flatMap((e) => e.photos);
  await prisma.tourneeModele.delete({ where: { id } });
  await Promise.all(photos.map((p) => unlinkDocumentFile(p.id, p.mimeType)));
  await logAdminAction(g.user.id, userLabel(g.user), "DELETE", "tournee-modele", id, modele.titre);
  revalidatePath("/tournees");
  return NextResponse.json({ success: true });
}
