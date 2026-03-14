import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import FicheForm from "../FicheForm";

export default async function NewFichePage() {
  await requireAdminSession();
  const [contacts, secteurs] = await Promise.all([
    prisma.contact.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, categorie: true } }),
    prisma.secteur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ligne: true } }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/fiches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux fiches
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle fiche réflexe</h1>
      </div>
      <FicheForm mode="create" contacts={contacts} secteurs={secteurs} />
    </div>
  );
}
