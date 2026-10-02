import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeLiensPayload } from "@/lib/liens-server";
import { guardModeleAdmin } from "@/lib/tournee/http";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const { id } = await params;
  const modele = await prisma.tourneeModele.findUnique({ where: { id }, select: { id: true } });
  if (!modele) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const result = await normalizeLiensPayload(body?.liens);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await prisma.tourneeModele.update({ where: { id }, data: { liens: result.json, version: { increment: 1 } } });
  return NextResponse.json({ success: true, count: result.count });
}
