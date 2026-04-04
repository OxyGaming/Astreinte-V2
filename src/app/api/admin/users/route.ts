import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/admin/users
export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, createdAt: true },
  });
  return NextResponse.json(users);
}

// POST /api/admin/users
export async function POST(req: NextRequest) {
  const { username, password, nom, prenom, role, email } = await req.json();

  if (!username || !password || !nom || !prenom || !role) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "L'adresse e-mail est requise (identifiant de connexion)" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json({ error: "Adresse e-mail invalide" }, { status: 400 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Identifiant déjà utilisé" }, { status: 409 });
  }
  const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) {
    return NextResponse.json({ error: "Adresse e-mail déjà utilisée" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, password: hash, nom, prenom, role, email: normalizedEmail },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, email: true },
  });

  return NextResponse.json(user, { status: 201 });
}
