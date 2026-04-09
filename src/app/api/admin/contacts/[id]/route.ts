import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } } },
  });
  if (!contact) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { nom, role, categorie, telephone, telephoneAlt, note, disponibilite } = body;
  const contact = await prisma.contact.update({
    where: { id },
    data: { nom, role, categorie, telephone, telephoneAlt: telephoneAlt || null, note: note || null, disponibilite: disponibilite || null },
  });
  await logAdminAction(user.id, `${user.prenom} ${user.nom}`, "UPDATE", "contact", id, `nom: ${nom}`);
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.ficheContact.deleteMany({ where: { contactId: id } });
  await prisma.contact.delete({ where: { id } });
  await logAdminAction(user.id, `${user.prenom} ${user.nom}`, "DELETE", "contact", id);
  return NextResponse.json({ success: true });
}
