import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import PosteForm from "../PosteForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditPostePage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const [poste, secteurs] = await Promise.all([
    prisma.poste.findUnique({ where: { id } }),
    prisma.secteur.findMany({ orderBy: { nom: "asc" }, select: { id: true, slug: true, nom: true } }),
  ]);

  if (!poste) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/postes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux postes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier : {poste.nom}</h1>
        <p className="text-gray-500 text-sm mt-1">Identifiant : {poste.id}</p>
      </div>
      <PosteForm mode="edit" poste={poste} secteurs={secteurs} />
    </div>
  );
}
