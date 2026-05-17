import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMainCouranteById, updateMainCourante, deleteMainCourante } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";
import type { MainCouranteUpdateInput } from "@/lib/db";

// PUT /api/admin/main-courante/[id] → éditer, valider ou rejeter
// L'admin peut éditer tous les champs (titre, nature, libellé, description, solution,
// avis sécurité, avis production, fiche liée), changer le statut et le motif de rejet.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();

  const { id } = await params;
  const entry = await getMainCouranteById(id);
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const {
    titre,
    nature,
    libelle,
    description,
    solution,
    avisSecurite,
    avisProduction,
    ficheSlug,
    editedDescription,
    status,
    rejetMotif,
  } = body as Record<string, string | undefined>;

  if (status && !["pending", "validated", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  // Helper : convertit "" → null, garde valeur trim ; undefined = ne touche pas.
  const norm = (v: string | undefined): string | null | undefined => {
    if (v === undefined) return undefined;
    const t = v.trim();
    return t === "" ? null : t;
  };

  const data: MainCouranteUpdateInput = {
    ...(titre !== undefined && { titre: norm(titre) }),
    ...(nature !== undefined && { nature: norm(nature) }),
    ...(libelle !== undefined && { libelle: norm(libelle) }),
    ...(description !== undefined && description.trim() !== "" && { description: description.trim() }),
    ...(solution !== undefined && { solution: norm(solution) }),
    ...(avisSecurite !== undefined && { avisSecurite: norm(avisSecurite) }),
    ...(avisProduction !== undefined && { avisProduction: norm(avisProduction) }),
    ...(ficheSlug !== undefined && { ficheSlug: norm(ficheSlug) }),
    ...(editedDescription !== undefined && { editedDescription: norm(editedDescription) }),
    ...(status !== undefined && { status }),
    ...(rejetMotif !== undefined && { rejetMotif: norm(rejetMotif) }),
  };

  if (status === "validated") {
    const user = await getCurrentUser();
    if (user) data.validatedByUserId = user.id;
  }

  const updated = await updateMainCourante(id, data);
  return NextResponse.json({ entry: updated });
}

// DELETE /api/admin/main-courante/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();

  const { id } = await params;
  const entry = await getMainCouranteById(id);
  if (!entry) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await deleteMainCourante(id);
  return NextResponse.json({ ok: true });
}
