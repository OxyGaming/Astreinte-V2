/**
 * GET  /api/admin/procedures  → Liste toutes les procédures
 * POST /api/admin/procedures  → Crée une nouvelle procédure
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const procedures = await prisma.procedure.findMany({
    orderBy: { titre: "asc" },
    include: { postes: { select: { posteId: true, ordre: true } } },
  });

  return NextResponse.json(procedures);
}

export async function POST(req: NextRequest) {
  let body: {
    slug?: string; titre?: string; typeProcedure?: string;
    description?: string; version?: string; etapes?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  if (!body.slug || !body.titre || !body.typeProcedure || !body.etapes) {
    return NextResponse.json({ error: "slug, titre, typeProcedure et etapes sont requis" }, { status: 400 });
  }

  const procedure = await prisma.procedure.create({
    data: {
      slug: body.slug,
      titre: body.titre,
      typeProcedure: body.typeProcedure,
      description: body.description ?? null,
      version: body.version ?? "1.0",
      etapes: typeof body.etapes === "string" ? body.etapes : JSON.stringify(body.etapes),
    },
  });

  return NextResponse.json(procedure, { status: 201 });
}
