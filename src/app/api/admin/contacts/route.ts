import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-auth";
import { logAdminAction } from "@/lib/audit";

export async function GET() {
  const contacts = await prisma.contact.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { nom, role, categorie, telephone, telephoneAlt, note, disponibilite } = body;
  if (!nom || !role || !categorie || !telephone) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: { nom, role, categorie, telephone, telephoneAlt: telephoneAlt || null, note: note || null, disponibilite: disponibilite || null },
  });
  await logAdminAction(user.id, `${user.prenom} ${user.nom}`, "CREATE", "contact", contact.id, `nom: ${nom}`);
  return NextResponse.json(contact, { status: 201 });
}
