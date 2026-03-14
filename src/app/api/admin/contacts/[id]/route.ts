import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } } },
  });
  if (!contact) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { nom, role, categorie, telephone, telephoneAlt, note, disponibilite } = body;
  const contact = await prisma.contact.update({
    where: { id },
    data: { nom, role, categorie, telephone, telephoneAlt: telephoneAlt || null, note: note || null, disponibilite: disponibilite || null },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  // Supprimer les jonctions avant de supprimer le contact
  await prisma.ficheContact.deleteMany({ where: { contactId: id } });
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
