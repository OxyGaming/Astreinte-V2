import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";

export default async function AdminAbreviationsPage() {
  await requireAdminSession();
  const abreviations = await prisma.abreviation.findMany({ orderBy: { sigle: "asc" } });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abréviations</h1>
          <p className="text-gray-500 text-sm mt-1">{abreviations.length} abréviation(s)</p>
        </div>
        <Link href="/admin/abreviations/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} />Nouvelle
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table style={{ minWidth: 480 }} className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-gray-600 w-24">Sigle</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600">Définition</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {abreviations.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5 font-mono font-bold text-gray-900">{a.sigle}</td>
                <td className="px-4 py-3.5 text-gray-600">{a.definition}</td>
                <td className="px-4 py-3.5">
                  <Link href={`/admin/abreviations/${a.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                    <Edit2 size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
