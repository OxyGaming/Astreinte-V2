import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { CircuitVoie } from "@/lib/types";

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
    if (!Array.isArray(body.circuitsVoie)) {
      return NextResponse.json(
        { error: 'Champ "circuitsVoie" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.circuitsVoie as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: CircuitVoie[] = raw.map((e) => {
      const entry = e as CircuitVoie;
      return {
        designation: entry.designation.trim(),
        ...(entry.voie?.trim()      ? { voie:      entry.voie.trim()      } : {}),
        ...(entry.delai_max?.trim() ? { delai_max: entry.delai_max.trim() } : {}),
        ...(entry.note?.trim()      ? { note:      entry.note.trim()      } : {}),
      };
    });

    await prisma.poste.update({
      where: { id },
      data: { circuitsVoie: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des circuits de voie" },
      { status: 500 }
    );
  }
}
