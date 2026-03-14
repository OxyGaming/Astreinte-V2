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
  const { username, password, nom, prenom, role } = await req.json();

  if (!username || !password || !nom || !prenom || !role) {
    return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Identifiant déjà utilisé" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, password: hash, nom, prenom, role },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true },
  });

  return NextResponse.json(user, { status: 201 });
}
