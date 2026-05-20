import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const icon = typeof body.icon === "string" && body.icon ? body.icon : "Link2";
  const couleur = typeof body.couleur === "string" && body.couleur ? body.couleur : "blue";

  if (!nom) {
    return NextResponse.json({ error: "Le nom de la thématique est obligatoire" }, { status: 400 });
  }

  const existing = await prisma.lienCategorie.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Thématique introuvable" }, { status: 404 });
  }

  const categorie = await prisma.lienCategorie.update({ where: { id }, data: { nom, icon, couleur } });
  return NextResponse.json(categorie);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.lienCategorie.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Thématique introuvable" }, { status: 404 });
  }

  // Les liens rattachés passent en « sans thématique » (FK onDelete: SetNull).
  await prisma.lienCategorie.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
