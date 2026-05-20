import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";
import type { Etape } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

function validateEntry(e: unknown, idx: number): string | null {
  if (!e || typeof e !== "object") return `Étape ${idx + 1} : objet attendu`;
  const entry = e as Record<string, unknown>;
  if (!entry.titre || typeof entry.titre !== "string" || !entry.titre.trim())
    return `Étape ${idx + 1} : champ "titre" obligatoire`;
  if (entry.description !== undefined && typeof entry.description !== "string")
    return `Étape ${idx + 1} : "description" doit être une chaîne`;
  if (entry.actions !== undefined && !Array.isArray(entry.actions))
    return `Étape ${idx + 1} : "actions" doit être un tableau`;
  if (Array.isArray(entry.actions)) {
    for (let j = 0; j < entry.actions.length; j++) {
      if (typeof entry.actions[j] !== "string")
        return `Étape ${idx + 1}, action ${j + 1} : chaîne attendue`;
    }
  }
  return null;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const fiche = await prisma.fiche.findUnique({ where: { id }, select: { id: true } });
    if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

    const body = await req.json();
    if (!Array.isArray(body.etapes)) {
      return NextResponse.json(
        { error: 'Champ "etapes" manquant ou non-tableau' },
        { status: 400 }
      );
    }

    const raw = body.etapes as unknown[];

    for (let i = 0; i < raw.length; i++) {
      const err = validateEntry(raw[i], i);
      if (err) return NextResponse.json({ error: err }, { status: 400 });
    }

    const normalized: Etape[] = raw.map((e, i) => {
      const entry = e as Etape;
      const actions = (entry.actions ?? []).map((s) => s.trim()).filter(Boolean);
      return {
        ordre: i + 1,
        titre: entry.titre.trim(),
        description: (entry.description ?? "").trim(),
        ...(actions.length > 0 ? { actions } : {}),
        ...(entry.critique === true ? { critique: true } : {}),
      };
    });

    await prisma.fiche.update({
      where: { id },
      data: { etapes: JSON.stringify(normalized) },
    });

    await logAdminAction(
      user.id,
      `${user.prenom} ${user.nom}`,
      "UPDATE",
      "fiche",
      id,
      `étapes (${normalized.length})`
    );

    revalidatePath("/fiches");
    revalidatePath("/fiches/[slug]", "page");

    return NextResponse.json({ success: true, count: normalized.length });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des étapes" },
      { status: 500 }
    );
  }
}
