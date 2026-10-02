import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/audit";
import { guardModeleAdmin, userLabel } from "@/lib/tournee/http";

export async function GET() {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const modeles = await prisma.tourneeModele.findMany({
    orderBy: [{ statut: "asc" }, { titre: "asc" }],
    include: { _count: { select: { etapes: true, realisations: true } } },
  });
  return NextResponse.json(modeles);
}

export async function POST(req: NextRequest) {
  const g = await guardModeleAdmin();
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const titre = typeof body?.titre === "string" ? body.titre.trim() : "";
  if (!titre) return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });

  const modele = await prisma.tourneeModele.create({
    data: {
      titre,
      sousTitre: typeof body?.sousTitre === "string" && body.sousTitre.trim() ? body.sousTitre.trim() : null,
      createdById: g.user.id,
      // Départ / restitution pré-créés : tout parcours commence et finit quelque part.
      etapes: {
        create: [
          { ordre: 0, type: "DEPART", titre: "Départ", dureeMin: 0, trajetSuivanteMin: 15 },
          { ordre: 1, type: "RESTITUTION", titre: "Restitution", dureeMin: 0 },
        ],
      },
    },
  });
  await logAdminAction(g.user.id, userLabel(g.user), "CREATE", "tournee-modele", modele.id, titre);
  return NextResponse.json(modele, { status: 201 });
}
