import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, status: true, email: true, poste: true, motif: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  return NextResponse.json(user);
}

// PUT /api/admin/users/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { username, email, password, nom, prenom, role, actif, status } = await req.json();

  const data: Record<string, unknown> = {};
  if (username !== undefined) {
    const clash = await prisma.user.findFirst({ where: { username, NOT: { id } } });
    if (clash) return NextResponse.json({ error: "Identifiant déjà utilisé" }, { status: 409 });
    data.username = username;
  }
  if (email !== undefined) {
    if (email !== null && email !== "") {
      const clash = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (clash) return NextResponse.json({ error: "Adresse e-mail déjà utilisée" }, { status: 409 });
      data.email = email;
    } else {
      data.email = null;
    }
  }
  if (nom !== undefined) data.nom = nom;
  if (prenom !== undefined) data.prenom = prenom;
  if (role !== undefined) data.role = role;
  if (actif !== undefined) data.actif = actif;
  if (password) data.password = await bcrypt.hash(password, 12);
  if (status !== undefined) {
    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.status = status;
    // Quand on approuve : activer le compte ; quand on rejette : désactiver
    if (status === "approved") data.actif = true;
    if (status === "rejected") data.actif = false;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, nom: true, prenom: true, role: true, actif: true, status: true },
  });
  return NextResponse.json(user);
}

// DELETE /api/admin/users/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
