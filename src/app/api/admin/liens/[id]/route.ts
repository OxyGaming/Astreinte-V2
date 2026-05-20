import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { isValidHttpUrl } from "@/lib/liens";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const libelle = typeof body.libelle === "string" ? body.libelle.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const categorieId = typeof body.categorieId === "string" && body.categorieId ? body.categorieId : null;

  if (!libelle) {
    return NextResponse.json({ error: "Le libellé est obligatoire" }, { status: 400 });
  }
  if (!isValidHttpUrl(url)) {
    return NextResponse.json({ error: "URL invalide (http ou https attendu)" }, { status: 400 });
  }

  const existing = await prisma.lien.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Lien introuvable" }, { status: 404 });
  }

  const lien = await prisma.lien.update({ where: { id }, data: { libelle, url, categorieId } });
  return NextResponse.json(lien);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.lien.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Lien introuvable" }, { status: 404 });
  }

  await prisma.lien.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
