import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const contacts = await prisma.contact.findMany({ orderBy: { nom: "asc" } });
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nom, role, categorie, telephone, telephoneAlt, note, disponibilite } = body;
  if (!nom || !role || !categorie || !telephone) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }
  const contact = await prisma.contact.create({
    data: { nom, role, categorie, telephone, telephoneAlt: telephoneAlt || null, note: note || null, disponibilite: disponibilite || null },
  });
  return NextResponse.json(contact, { status: 201 });
}
