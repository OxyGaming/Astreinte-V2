export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProcedureEditor from "./_components/ProcedureEditor";
import { metierToForm } from "@/lib/procedure/form-types";

export default async function EditProcedurePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [procedure, postes] = await Promise.all([
    prisma.procedure.findUnique({
      where: { id },
      include: { postes: { select: { posteId: true } } },
    }),
    prisma.poste.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, slug: true } }),
  ]);
  if (!procedure) notFound();
  return (
    <div className="p-8">
      <ProcedureEditor initialForm={metierToForm(procedure)} postes={postes} />
    </div>
  );
}
