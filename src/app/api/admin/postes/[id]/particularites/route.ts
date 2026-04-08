import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const poste = await prisma.poste.findUnique({ where: { id }, select: { id: true } });
    if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.particularites)) {
      return NextResponse.json(
        { error: 'Champ "particularites" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.particularites as unknown[];

    for (let i = 0; i < raw.length; i++) {
      if (typeof raw[i] !== "string" || !(raw[i] as string).trim()) {
        return NextResponse.json(
          { error: `Entrée ${i + 1} : chaîne non vide attendue` },
          { status: 400 }
        );
      }
    }

    const normalized = (raw as string[]).map((s) => s.trim()).filter(Boolean);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "Au moins une particularité est requise" },
        { status: 400 }
      );
    }

    await prisma.poste.update({
      where: { id },
      data: { particularites: JSON.stringify(normalized) },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des particularités" },
      { status: 500 }
    );
  }
}
