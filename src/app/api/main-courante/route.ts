import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getValidatedMainCourantes, createMainCourante } from "@/lib/db";

const MAX_DESCRIPTION = 5000;
const MAX_SOLUTION = 5000;
const MAX_NATURE = 50;
const MAX_LIBELLE = 200;

// GET /api/main-courante?q=search → entrées validées (tous utilisateurs connectés)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const entries = await getValidatedMainCourantes(q);
  return NextResponse.json({ entries });
}

// POST /api/main-courante → soumettre une nouvelle entrée
// Le contributeur saisit : nature, libelle, description, solution, ficheSlug.
// Les champs titre, avisSecurite, avisProduction sont réservés à l'admin.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { nature, libelle, description, solution, ficheSlug, clientOpId } = body as Record<string, string>;

  if (!description?.trim()) {
    return NextResponse.json({ error: "La description est requise" }, { status: 400 });
  }
  if (description.trim().length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: `Description trop longue (max ${MAX_DESCRIPTION} caractères)` }, { status: 400 });
  }
  if (solution && solution.trim().length > MAX_SOLUTION) {
    return NextResponse.json({ error: `Solution trop longue (max ${MAX_SOLUTION} caractères)` }, { status: 400 });
  }
  if (nature && nature.trim().length > MAX_NATURE) {
    return NextResponse.json({ error: `Nature trop longue (max ${MAX_NATURE} caractères)` }, { status: 400 });
  }
  if (libelle && libelle.trim().length > MAX_LIBELLE) {
    return NextResponse.json({ error: `Libellé trop long (max ${MAX_LIBELLE} caractères)` }, { status: 400 });
  }

  const entry = await createMainCourante({
    description: description.trim(),
    auteurId: user.id,
    nature: nature?.trim() || undefined,
    libelle: libelle?.trim() || undefined,
    solution: solution?.trim() || undefined,
    ficheSlug: ficheSlug?.trim() || undefined,
    clientOpId: clientOpId?.trim() || undefined,
  });
  return NextResponse.json({ entry }, { status: 201 });
}
