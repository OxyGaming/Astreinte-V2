import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import {
  getAllFiches,
  getAllPostes,
  getAllSecteurs,
  getAllContacts,
  getSessionsForUser,
  getValidatedMainCourantes,
  getUserMainCourantes,
  getActiveProcedureSessionIds,
  getPosteProcedureTypes,
  getAllDocumentIds,
} from "@/lib/db";

/**
 * GET /api/offline/slugs
 * Inventaire de tout ce que le Service Worker doit précacher pour le hors ligne :
 * slugs/ids de pages dynamiques, sessions, documents, types de procédure.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const [
    fiches,
    postes,
    secteurs,
    contacts,
    sessions,
    validatedMC,
    userMC,
    procedureSessions,
    posteProcedureTypes,
    documents,
  ] = await Promise.all([
    getAllFiches(),
    getAllPostes(),
    getAllSecteurs(),
    getAllContacts(),
    getSessionsForUser(user.id, user.role as "USER" | "EDITOR" | "ADMIN"),
    getValidatedMainCourantes(),
    getUserMainCourantes(user.id),
    getActiveProcedureSessionIds(),
    getPosteProcedureTypes(),
    getAllDocumentIds(),
  ]);

  // Mains courantes consultables : entrées validées + soumissions de l'utilisateur.
  const mainCourantes = [
    ...new Set([...validatedMC.map((m) => m.id), ...userMC.map((m) => m.id)]),
  ];

  return NextResponse.json(
    {
      fiches: fiches.map((f) => f.slug),
      postes: postes.map((p) => p.slug),
      secteurs: secteurs.map((s) => s.slug),
      contacts: contacts.map((c) => c.id),
      sessions: sessions.map((s) => s.id),
      mainCourantes,
      procedureSessions,
      posteProcedureTypes,
      documents,
    },
    {
      headers: {
        // Ne pas mettre en cache côté HTTP — le SW gère son propre cache.
        "Cache-Control": "no-store",
      },
    }
  );
}
