import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getValidatedMainCourantes, createMainCourante } from "@/lib/db";

// GET /api/main-courante?q=search → entrées validées (tous utilisateurs connectés)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const entries = await getValidatedMainCourantes(q);
  return NextResponse.json({ entries });
}

// POST /api/main-courante → soumettre une nouvelle entrée
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { titre, description, ficheSlug } = body as Record<string, string>;
  if (!titre?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Titre et description requis" }, { status: 400 });
  }
  if (titre.trim().length > 200) {
    return NextResponse.json({ error: "Titre trop long (max 200 caractères)" }, { status: 400 });
  }

  const entry = await createMainCourante(
    titre.trim(),
    description.trim(),
    user.id,
    ficheSlug?.trim() || undefined
  );
  return NextResponse.json({ entry }, { status: 201 });
}
