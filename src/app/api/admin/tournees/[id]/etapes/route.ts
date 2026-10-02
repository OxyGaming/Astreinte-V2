import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { unlinkDocumentFile } from "@/lib/documents";
import { guardModeleAdmin, userLabel } from "@/lib/tournee/http";
import { validerEtape } from "@/lib/tournee/parse";
import type { TourneeEtapeInput } from "@/lib/tournee/types";

type Params = { params: Promise<{ id: string }> };

/**
 * PUT — remplace la liste ordonnée des étapes d'un modèle.
 * Les étapes existantes (id connu) sont mises à jour, les nouvelles créées,
 * les absentes supprimées (avec leurs photos).
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const modele = await prisma.tourneeModele.findUnique({
    where: { id },
    include: { etapes: { select: { id: true, photos: { select: { id: true, mimeType: true } } } } },
  });
  if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.etapes)) {
    return NextResponse.json({ error: 'Champ "etapes" manquant ou non-tableau' }, { status: 400 });
  }

  const etapes: TourneeEtapeInput[] = [];
  for (let i = 0; i < body.etapes.length; i++) {
    const r = validerEtape(body.etapes[i], `Étape ${i + 1}`);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    etapes.push(r.value);
  }
  if (!etapes.some((e) => !e.optionnelle)) {
    return NextResponse.json({ error: "Le parcours doit comporter au moins une étape obligatoire" }, { status: 400 });
  }

  const lienIds = [...new Set(etapes.flatMap((e) => e.liens.filter((l) => l.lienId).map((l) => l.lienId!)))];
  if (lienIds.length) {
    const found = await prisma.lien.count({ where: { id: { in: lienIds } } });
    if (found !== lienIds.length) {
      return NextResponse.json({ error: "Un lien référencé n'existe plus dans la collection." }, { status: 400 });
    }
  }

  const existants = new Map(modele.etapes.map((e) => [e.id, e]));
  const gardes = new Set(etapes.filter((e) => e.id && existants.has(e.id)).map((e) => e.id!));
  const supprimees = modele.etapes.filter((e) => !gardes.has(e.id));

  const data = (e: TourneeEtapeInput, ordre: number) => ({
    ordre,
    type: e.type,
    titre: e.titre,
    description: e.description ?? null,
    optionnelle: e.optionnelle,
    heureImposee: e.heureImposee ?? null,
    dureeMin: e.dureeMin,
    trajetSuivanteMin: e.trajetSuivanteMin,
    surcoutTrajetMin: e.surcoutTrajetMin ?? null,
    adresse: e.adresse ?? null,
    latitude: e.latitude ?? null,
    longitude: e.longitude ?? null,
    localisationMasquee: e.localisationMasquee,
    liens: JSON.stringify(e.liens),
    contenu: JSON.stringify(e.contenu),
  });

  await prisma.$transaction(async (tx) => {
    if (supprimees.length) {
      await tx.tourneeEtape.deleteMany({ where: { id: { in: supprimees.map((e) => e.id) } } });
    }
    for (let i = 0; i < etapes.length; i++) {
      const e = etapes[i];
      if (e.id && gardes.has(e.id)) {
        await tx.tourneeEtape.update({ where: { id: e.id }, data: data(e, i) });
      } else {
        await tx.tourneeEtape.create({ data: { ...data(e, i), modeleId: id } });
      }
    }
    await tx.tourneeModele.update({ where: { id }, data: { version: { increment: 1 } } });
  });

  await Promise.all(supprimees.flatMap((e) => e.photos).map((p) => unlinkDocumentFile(p.id, p.mimeType)));
  await logAdminAction(g.user.id, userLabel(g.user), "UPDATE", "tournee-modele", id, `étapes : ${etapes.length}`);
  revalidatePath("/tournees");

  const saved = await prisma.tourneeEtape.findMany({
    where: { modeleId: id },
    orderBy: { ordre: "asc" },
    include: { photos: { orderBy: { ordre: "asc" } } },
  });
  return NextResponse.json({ count: saved.length, etapes: saved });
}
