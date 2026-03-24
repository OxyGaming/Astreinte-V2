/**
 * GET    /api/admin/procedures/[id]  → Récupère une procédure avec ses associations
 * PUT    /api/admin/procedures/[id]  → Mise à jour
 * DELETE /api/admin/procedures/[id]  → Suppression
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const procedure = await prisma.procedure.findUnique({
    where: { id },
    include: {
      postes: {
        include: { poste: { select: { id: true, slug: true, nom: true } } },
        orderBy: { ordre: "asc" },
      },
    },
  });

  if (!procedure) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(procedure);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: {
    slug?: string; titre?: string; typeProcedure?: string;
    description?: string; version?: string; etapes?: unknown;
    posteIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const procedure = await prisma.procedure.update({
    where: { id },
    data: {
      ...(body.slug && { slug: body.slug }),
      ...(body.titre && { titre: body.titre }),
      ...(body.typeProcedure && { typeProcedure: body.typeProcedure }),
      description: body.description ?? undefined,
      ...(body.version && { version: body.version }),
      ...(body.etapes !== undefined && {
        etapes: typeof body.etapes === "string" ? body.etapes : JSON.stringify(body.etapes),
      }),
    },
  });

  // Mise à jour des associations poste si fourni
  if (body.posteIds !== undefined) {
    await prisma.posteProcedure.deleteMany({ where: { procedureId: id } });
    if (body.posteIds.length > 0) {
      await prisma.posteProcedure.createMany({
        data: body.posteIds.map((posteId, i) => ({ posteId, procedureId: id, ordre: i })),
      });
    }
  }

  return NextResponse.json(procedure);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.procedure.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
