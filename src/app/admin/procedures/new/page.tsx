import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import ProcedureEditor from "../[id]/edit/_components/ProcedureEditor";
import { emptyProcedureForm } from "@/lib/procedure/form-types";

export default async function NewProcedurePage() {
  await requireAdminSession();
  const postes = await prisma.poste.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, slug: true },
  });
  return (
    <div className="p-8">
      <ProcedureEditor initialForm={emptyProcedureForm()} postes={postes} />
    </div>
  );
}
