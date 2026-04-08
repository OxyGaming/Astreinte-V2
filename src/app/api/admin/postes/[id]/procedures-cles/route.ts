import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ProcedureCle } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.titre || typeof entry.titre !== "string" || !entry.titre.trim())
    return `Entrée ${idx + 1} : champ "titre" obligatoire`;
  if (!entry.description || typeof entry.description !== "string" || !entry.description.trim())
    return `Entrée ${idx + 1} : champ "description" obligatoire`;
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.proceduresCles)) {
      return NextResponse.json(
        { error: 'Champ "proceduresCles" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.proceduresCles as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: ProcedureCle[] = raw.map((e) => {
      const entry = e as ProcedureCle;
      return {
        titre:       entry.titre.trim(),
        description: entry.description.trim(),
        ...(entry.reference?.trim() ? { reference: entry.reference.trim() } : {}),
      };
    });

    await prisma.poste.update({
      where: { id },
      data: { proceduresCles: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des procédures clés" },
      { status: 500 }
    );
  }
}
