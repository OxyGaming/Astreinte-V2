import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PassageNiveau } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.numero || typeof entry.numero !== "string" || !entry.numero.trim())
    return `Entrée ${idx + 1} : champ "numero" obligatoire`;
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const secteur = await prisma.secteur.findUnique({ where: { id }, select: { id: true } });
    if (!secteur) return NextResponse.json({ error: "Secteur introuvable" }, { status: 404 });

    const body = await req.json();

    // pn est optionnel — null autorisé pour effacer
    if (body.pn !== null && !Array.isArray(body.pn)) {
      return NextResponse.json(
        { error: 'Champ "pn" doit être un tableau ou null' },
        { status: 400 }
      );
    }

    if (body.pn === null) {
      await prisma.secteur.update({ where: { id }, data: { pn: null } });
      revalidatePath("/secteurs");
      revalidatePath("/secteurs/[slug]", "page");
      return NextResponse.json({ success: true, count: 0 });
    }

    const raw = body.pn as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: PassageNiveau[] = raw.map((e) => {
      const entry = e as PassageNiveau;
      return {
        numero: entry.numero.trim(),
        ...(entry.axe?.trim()             ? { axe:             entry.axe.trim()             } : {}),
        ...(entry.contact_urgence?.trim() ? { contact_urgence: entry.contact_urgence.trim() } : {}),
        ...(entry.note?.trim()            ? { note:            entry.note.trim()            } : {}),
      };
    });

    await prisma.secteur.update({
      where: { id },
      data: { pn: normalized.length > 0 ? JSON.stringify(normalized) : null },
    });

    revalidatePath("/secteurs");
    revalidatePath("/secteurs/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des passages à niveau" },
      { status: 500 }
    );
  }
}
