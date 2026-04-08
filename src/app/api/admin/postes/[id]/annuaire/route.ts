import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AnnuaireEntry } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.nom || typeof entry.nom !== "string" || !entry.nom.trim())
    return `Entrée ${idx + 1} : champ "nom" obligatoire`;
  if (entry.email && typeof entry.email === "string" && entry.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email.trim()))
      return `Entrée ${idx + 1} : format email invalide ("${entry.email}")`;
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.annuaire)) {
      return NextResponse.json({ error: 'Champ "annuaire" manquant ou non-tableau' }, { status: 400 });
    }

    const raw = body.annuaire as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    // Normalisation : réindexer ordre, nettoyer les champs optionnels
    const normalized: AnnuaireEntry[] = raw.map((e, i) => {
      const entry = e as AnnuaireEntry;
      return {
        ordre: i,
        nom: entry.nom.trim(),
        ...(entry.section?.trim() ? { section: entry.section.trim() } : {}),
        ...(entry.fonction?.trim() ? { fonction: entry.fonction.trim() } : {}),
        ...(entry.telephone?.trim() ? { telephone: entry.telephone.trim() } : {}),
        ...(entry.email?.trim() ? { email: entry.email.trim() } : {}),
        ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
      };
    });

    await prisma.poste.update({
      where: { id },
      data: { annuaire: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json({ error: "Erreur serveur lors de la mise à jour de l'annuaire" }, { status: 500 });
  }
}
