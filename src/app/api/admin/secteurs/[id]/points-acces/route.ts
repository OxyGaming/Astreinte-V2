import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PointAcces } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.nom || typeof entry.nom !== "string" || !entry.nom.trim())
    return `Entrée ${idx + 1} : champ "nom" obligatoire`;
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const secteur = await prisma.secteur.findUnique({ where: { id }, select: { id: true } });
    if (!secteur) return NextResponse.json({ error: "Secteur introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.pointsAcces)) {
      return NextResponse.json(
        { error: 'Champ "pointsAcces" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.pointsAcces as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: PointAcces[] = raw.map((e) => {
      const entry = e as PointAcces;
      return {
        nom: entry.nom.trim(),
        ...(entry.adresse?.trim()   ? { adresse:   entry.adresse.trim()   } : {}),
        ...(entry.gps?.trim()       ? { gps:       entry.gps.trim()       } : {}),
        ...(entry.note?.trim()      ? { note:       entry.note.trim()      } : {}),
        ...(entry.code?.trim()      ? { code:       entry.code.trim()      } : {}),
        ...(entry.reference?.trim() ? { reference: entry.reference.trim() } : {}),
      };
    });

    await prisma.secteur.update({
      where: { id },
      data: { pointsAcces: JSON.stringify(normalized) },
    });

    revalidatePath("/secteurs");
    revalidatePath("/secteurs/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des points d'accès" },
      { status: 500 }
    );
  }
}
