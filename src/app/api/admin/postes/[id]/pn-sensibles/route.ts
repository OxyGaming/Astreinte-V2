import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PNSensiblePoste } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Entrée ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.numero || typeof entry.numero !== "string" || !entry.numero.trim())
    return `Entrée ${idx + 1} : champ "numero" obligatoire`;
  if (!entry.contact || typeof entry.contact !== "string" || !entry.contact.trim())
    return `Entrée ${idx + 1} : champ "contact" obligatoire`;
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.pnSensibles)) {
      return NextResponse.json(
        { error: 'Champ "pnSensibles" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.pnSensibles as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: PNSensiblePoste[] = raw.map((e) => {
      const entry = e as PNSensiblePoste;
      return {
        numero: entry.numero.trim(),
        contact: entry.contact.trim(),
        ...(entry.telephone?.trim() ? { telephone: entry.telephone.trim() } : {}),
        ...(entry.note?.trim() ? { note: entry.note.trim() } : {}),
      };
    });

    await prisma.poste.update({
      where: { id },
      data: { pnSensibles: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des PN sensibles" },
      { status: 500 }
    );
  }
}
