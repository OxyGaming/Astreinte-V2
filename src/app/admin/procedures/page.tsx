export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ClipboardList, Edit2, Building2 } from "lucide-react";
import ProcedureDeleteButton from "./_components/ProcedureDeleteButton";
import ProcedureDuplicateButton from "./_components/ProcedureDuplicateButton";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  cessation: { label: "Cessation", color: "bg-red-100 text-red-700" },
  reprise: { label: "Reprise", color: "bg-green-100 text-green-700" },
  incident: { label: "Incident", color: "bg-amber-100 text-amber-700" },
  travaux: { label: "Travaux", color: "bg-blue-100 text-blue-700" },
  autre: { label: "Autre", color: "bg-gray-100 text-gray-700" },
};

export default async function AdminProceduresPage() {
  await requireAdminSession();
  const procedures = await prisma.procedure.findMany({
    orderBy: { titre: "asc" },
    include: {
      postes: { include: { poste: { select: { nom: true } } } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procédures guidées</h1>
          <p className="text-gray-500 text-sm mt-1">{procedures.length} procédure(s)</p>
        </div>
        <Link
          href="/admin/procedures/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouvelle procédure
        </Link>
      </div>

      {procedures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune procédure — créez-en une pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table style={{ minWidth: 720 }} className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Postes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {procedures.map((proc) => {
                const typeMeta = TYPE_LABELS[proc.typeProcedure] ?? { label: proc.typeProcedure, color: "bg-gray-100 text-gray-700" };
                let etapeCount = 0;
                try { etapeCount = JSON.parse(proc.etapes).length; } catch { etapeCount = 0; }
                return (
                  <tr key={proc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{proc.titre}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{proc.slug}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{etapeCount} étape{etapeCount !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeMeta.color}`}>
                        {typeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 font-mono text-xs">v{proc.version}</td>
                    <td className="px-4 py-4">
                      {proc.postes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {proc.postes.map((pp) => (
                            <span key={pp.posteId} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              <Building2 size={10} />
                              {pp.poste.nom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Aucun poste</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/admin/procedures/${proc.id}/edit`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={15} />
                        </Link>
                        <ProcedureDuplicateButton id={proc.id} />
                        <ProcedureDeleteButton id={proc.id} titre={proc.titre} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
