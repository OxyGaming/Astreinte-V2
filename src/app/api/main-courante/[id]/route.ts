import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getMainCouranteById } from "@/lib/db";

// GET /api/main-courante/[id] → détail d'une entrée validée
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const entry = await getMainCouranteById(id);
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Utilisateur normal ne peut voir que les entrées validées ou les siennes
  if (entry.status !== "validated" && entry.auteurId !== user.id && user.role === "USER") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  return NextResponse.json({ entry });
}
