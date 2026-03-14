import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus } from "lucide-react";
import SecteursList from "./SecteursList";

export default async function AdminSecteursPage() {
  await requireAdminSession();
  const secteurs = await prisma.secteur.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { fiches: true, postes: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secteurs</h1>
          <p className="text-gray-500 text-sm mt-1">{secteurs.length} secteur(s) enregistré(s)</p>
        </div>
        <Link
          href="/admin/secteurs/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouveau secteur
        </Link>
      </div>

      <SecteursList initialSecteurs={secteurs} />
    </div>
  );
}
