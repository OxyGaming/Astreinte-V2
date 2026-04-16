import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, isFrontOfficeAdmin } from "@/lib/admin-auth";
import { getMainCouranteById, updateMainCourante, deleteMainCourante } from "@/lib/db";
import { getCurrentUser } from "@/lib/user-auth";

// PUT /api/admin/main-courante/[id] → éditer, valider ou rejeter
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

  const { titre, editedDescription, status, rejetMotif } = body as Record<string, string>;

  if (status && !["pending", "validated", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const updated = await updateMainCourante(id, {
    ...(titre !== undefined && { titre: titre.trim() }),
    ...(editedDescription !== undefined && { editedDescription: editedDescription.trim() }),
    ...(status !== undefined && { status }),
    ...(rejetMotif !== undefined && { rejetMotif: rejetMotif.trim() || undefined }),
    ...(status === "validated" && user && { validatedByUserId: user.id }),
  });

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
