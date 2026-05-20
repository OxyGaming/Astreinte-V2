import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";

export async function GET() {
  const categories = await prisma.lienCategorie.findMany({
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const icon = typeof body.icon === "string" && body.icon ? body.icon : "Link2";
  const couleur = typeof body.couleur === "string" && body.couleur ? body.couleur : "blue";

  if (!nom) {
    return NextResponse.json({ error: "Le nom de la thématique est obligatoire" }, { status: 400 });
  }

  const ordre = await prisma.lienCategorie.count();
  const categorie = await prisma.lienCategorie.create({ data: { nom, icon, couleur, ordre } });
  return NextResponse.json(categorie, { status: 201 });
}
