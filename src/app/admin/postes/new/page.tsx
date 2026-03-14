import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PosteForm from "../PosteForm";

export default async function NewPostePage() {
  await requireAdminSession();
  const secteurs = await prisma.secteur.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, slug: true, nom: true },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/postes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux postes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau poste</h1>
        <p className="text-gray-500 text-sm mt-1">Créer un nouveau référentiel de compétences</p>
      </div>
      <PosteForm mode="create" secteurs={secteurs} />
    </div>
  );
}
