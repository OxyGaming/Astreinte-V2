import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Procedure } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.titre || typeof entry.titre !== "string" || !entry.titre.trim())
    return `Entrée ${idx + 1} : champ "titre" obligatoire`;
  if (!entry.description || typeof entry.description !== "string" || !entry.description.trim())
    return `Entrée ${idx + 1} : champ "description" obligatoire`;
  if (entry.etapes !== undefined && !Array.isArray(entry.etapes))
    return `Entrée ${idx + 1} : "etapes" doit être un tableau`;
  if (Array.isArray(entry.etapes)) {
    for (let j = 0; j < entry.etapes.length; j++) {
      if (typeof entry.etapes[j] !== "string")
        return `Entrée ${idx + 1}, étape ${j + 1} : chaîne attendue`;
    }
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const secteur = await prisma.secteur.findUnique({ where: { id }, select: { id: true } });
    if (!secteur) return NextResponse.json({ error: "Secteur introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.procedures)) {
      return NextResponse.json(
        { error: 'Champ "procedures" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.procedures as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: Procedure[] = raw.map((e) => {
      const entry = e as Procedure;
      const etapes = (entry.etapes ?? []).map((s) => s.trim()).filter(Boolean);
      return {
        titre:       entry.titre.trim(),
        description: entry.description.trim(),
        ...(etapes.length > 0              ? { etapes }                     : {}),
        ...(entry.critique === true        ? { critique: true }             : {}),
        ...(entry.reference?.trim()        ? { reference: entry.reference.trim() } : {}),
      };
    });

    await prisma.secteur.update({
      where: { id },
      data: { procedures: JSON.stringify(normalized) },
    });

    revalidatePath("/secteurs");
    revalidatePath("/secteurs/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des procédures" },
      { status: 500 }
    );
  }
}
