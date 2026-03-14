import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";

const couleurClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700", amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700", green: "bg-green-100 text-green-700", purple: "bg-purple-100 text-purple-700",
};

export default async function AdminMnemoniquesPage() {
  await requireAdminSession();
  const mnemoniques = await prisma.mnemonique.findMany({ orderBy: { acronyme: "asc" } });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mnémoniques</h1>
          <p className="text-gray-500 text-sm mt-1">{mnemoniques.length} mnémonique(s)</p>
        </div>
        <Link href="/admin/mnemoniques/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} />Nouveau
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-50">
        {mnemoniques.map((m) => (
          <div key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {m.couleur && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${couleurClasses[m.couleur] || "bg-gray-100 text-gray-700"}`}>
                    {m.acronyme}
                  </span>
                )}
                <p className="font-medium text-gray-900">{m.titre}</p>
              </div>
              <p className="text-sm text-gray-500 truncate">{m.description}</p>
            </div>
            <Link href={`/admin/mnemoniques/${m.id}`}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0">
              <Edit2 size={15} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
