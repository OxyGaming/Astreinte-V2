/**
 * GET /api/postes/[slug]/procedures?type=cessation
 * Retourne le poste (id, nom, slug) et ses procédures associées, filtrées par type.
 *
 * Les procédures sont renvoyées complètes (étapes incluses) : c'est le snapshot
 * nécessaire pour démarrer une session — y compris hors ligne, où le client
 * construit la session localement à partir de cette réponse mise en cache.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/prisma";
import type { ProcedureMetier, EtapeMetier } from "@/lib/procedure/types";

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
              etapes: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!poste) return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });

  let procedures: ProcedureMetier[] = poste.proceduresMetier.map((pp) => ({
    id: pp.procedure.id,
    slug: pp.procedure.slug,
    titre: pp.procedure.titre,
    typeProcedure: pp.procedure.typeProcedure as ProcedureMetier["typeProcedure"],
    description: pp.procedure.description ?? undefined,
    version: pp.procedure.version,
    etapes: JSON.parse(pp.procedure.etapes) as EtapeMetier[],
    createdAt: pp.procedure.createdAt.toISOString(),
    updatedAt: pp.procedure.updatedAt.toISOString(),
  }));
  if (type) {
    procedures = procedures.filter((p) => p.typeProcedure === type);
  }

  return NextResponse.json({
    poste: { id: poste.id, nom: poste.nom, slug: poste.slug },
    procedures,
  });
}
