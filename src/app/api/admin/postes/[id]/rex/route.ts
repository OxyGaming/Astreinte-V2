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

    if (body.rex !== null && !Array.isArray(body.rex)) {
      return NextResponse.json(
        { error: 'Champ "rex" doit être un tableau de chaînes ou null' },
        { status: 400 }
      );
    }

    if (body.rex === null) {
      await prisma.poste.update({ where: { id }, data: { rex: null } });
      revalidatePath("/postes");
      revalidatePath("/postes/[slug]", "page");
      return NextResponse.json({ success: true, count: 0 });
    }

    const raw = body.rex as unknown[];

    for (let i = 0; i < raw.length; i++) {
      if (typeof raw[i] !== "string" || !(raw[i] as string).trim()) {
        return NextResponse.json(
          { error: `Entrée ${i + 1} : chaîne non vide attendue` },
          { status: 400 }
        );
      }
    }

    const normalized = (raw as string[]).map((s) => s.trim()).filter(Boolean);

    await prisma.poste.update({
      where: { id },
      data: { rex: normalized.length > 0 ? JSON.stringify(normalized) : null },
    });

    revalidatePath("/postes");
    revalidatePath("/postes/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des REX" },
      { status: 500 }
    );
  }
}
