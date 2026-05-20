import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import ProcedureEditor from "../[id]/edit/_components/ProcedureEditor";
import { emptyProcedureForm } from "@/lib/procedure/form-types";
import { getAllLiens } from "@/lib/db";

export default async function NewProcedurePage() {
  await requireAdminSession();
  const [postes, liensCollection] = await Promise.all([
    prisma.poste.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, slug: true } }),
    getAllLiens(),
  ]);
  return (
    <div className="p-8">
      <ProcedureEditor initialForm={emptyProcedureForm()} postes={postes} collection={liensCollection} />
    </div>
  );
}
