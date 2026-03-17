import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateRegisterInput } from "@/lib/validate";

// POST /api/register — inscription publique (compte créé en statut "pending")
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const data = validateRegisterInput(body);
  if (!data) {
    return NextResponse.json(
      { error: "Données invalides. Vérifiez tous les champs obligatoires." },
      { status: 400 }
    );
  }

  // Vérifier que l'identifiant n'est pas déjà utilisé
  const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Cet identifiant est déjà utilisé." }, { status: 409 });
  }

  // Vérifier que l'email n'est pas déjà utilisé (si fourni)
  if (data.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Cette adresse e-mail est déjà utilisée." }, { status: 409 });
    }
  }

  const hash = await bcrypt.hash(data.password, 12);

  await prisma.user.create({
    data: {
      username: data.username,
      password: hash,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email ?? null,
      poste: data.poste ?? null,
      motif: data.motif ?? null,
      role: "USER",
      actif: false,       // inactif jusqu'à approbation
      status: "pending",  // en attente de validation admin
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
