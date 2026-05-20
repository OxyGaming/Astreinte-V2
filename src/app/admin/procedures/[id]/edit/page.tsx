export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProcedureEditor from "./_components/ProcedureEditor";
import { metierToForm } from "@/lib/procedure/form-types";
import { getAllLiens } from "@/lib/db";

export default async function EditProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [procedure, postes, liensCollection] = await Promise.all([
    prisma.procedure.findUnique({
      where: { id },
      include: { postes: { select: { posteId: true } } },
    }),
    prisma.poste.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, slug: true } }),
    getAllLiens(),
  ]);
  if (!procedure) notFound();
  return (
    <div className="p-8">
      <ProcedureEditor initialForm={metierToForm(procedure)} postes={postes} collection={liensCollection} />
    </div>
  );
}
