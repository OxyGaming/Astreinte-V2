/**
 * GET /api/postes/[slug]/procedures?type=cessation
 * Retourne le poste (id, nom, slug) et ses procédures associées, filtrées par type.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { slug } = await params;
  const type = req.nextUrl.searchParams.get("type") ?? undefined;

  const poste = await prisma.poste.findUnique({
    where: { slug },
    select: {
      id: true,
      nom: true,
      slug: true,
      proceduresMetier: {
        orderBy: { ordre: "asc" },
        include: {
          procedure: {
            select: {
              id: true,
              slug: true,
              titre: true,
              description: true,
              version: true,
              typeProcedure: true,
            },
          },
        },
      },
    },
  });

  if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

  let procedures = poste.proceduresMetier.map((pp) => pp.procedure);
  if (type) {
    procedures = procedures.filter((p) => p.typeProcedure === type);
  }

  return NextResponse.json({
    poste: { id: poste.id, nom: poste.nom, slug: poste.slug },
    procedures,
  });
}
