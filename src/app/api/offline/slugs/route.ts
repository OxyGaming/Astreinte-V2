import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { getAllFiches, getAllPostes, getAllSecteurs } from "@/lib/db";

/**
 * GET /api/offline/slugs
 * Retourne la liste de tous les slugs de pages à précacher hors ligne.
 * Utilisé par le Service Worker pour construire la liste d'URLs à pré-charger.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [fiches, postes, secteurs] = await Promise.all([
    getAllFiches(),
    getAllPostes(),
    getAllSecteurs(),
  ]);

  return NextResponse.json(
    {
      fiches: fiches.map((f) => f.slug),
      postes: postes.map((p) => p.slug),
      secteurs: secteurs.map((s) => s.slug),
    },
    {
      headers: {
        // Ne pas mettre en cache côté HTTP — le SW gère son propre cache
        "Cache-Control": "no-store",
      },
    }
  );
}
