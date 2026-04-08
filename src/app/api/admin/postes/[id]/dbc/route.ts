import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Dbc } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.designation || typeof entry.designation !== "string" || !entry.designation.trim())
    return `Entrée ${idx + 1} : champ "designation" obligatoire`;
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    // dbc est optionnel — null autorisé pour effacer
    if (body.dbc !== null && !Array.isArray(body.dbc)) {
      return NextResponse.json(
        { error: 'Champ "dbc" doit être un tableau ou null' },
        { status: 400 }
      );
    }

    if (body.dbc === null) {
      await prisma.poste.update({ where: { id }, data: { dbc: null } });
      revalidatePath("/postes");
      revalidatePath("/postes/[slug]", "page");
      return NextResponse.json({ success: true, count: 0 });
    }

    const raw = body.dbc as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: Dbc[] = raw.map((e) => {
      const entry = e as Dbc;
      return {
        designation: entry.designation.trim(),
        ...(entry.voie?.trim() ? { voie: entry.voie.trim() } : {}),
        ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
      };
    });

    await prisma.poste.update({
      where: { id },
      data: { dbc: normalized.length > 0 ? JSON.stringify(normalized) : null },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des DBC" },
      { status: 500 }
    );
  }
}
