import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { isValidHttpUrl } from "@/lib/liens";

export async function GET() {
  const liens = await prisma.lien.findMany({
    orderBy: [{ ordre: "asc" }, { libelle: "asc" }],
  });
  return NextResponse.json(liens);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const libelle = typeof body.libelle === "string" ? body.libelle.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!libelle) {
    return NextResponse.json({ error: "Le libellé est obligatoire" }, { status: 400 });
  }
  if (!isValidHttpUrl(url)) {
    return NextResponse.json({ error: "URL invalide (http ou https attendu)" }, { status: 400 });
  }

  const ordre = await prisma.lien.count();
  const lien = await prisma.lien.create({ data: { libelle, url, ordre } });
  return NextResponse.json(lien, { status: 201 });
}
