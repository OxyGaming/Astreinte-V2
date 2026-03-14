import { requireAdminSession } from "@/lib/admin-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SecteurForm from "../[id]/SecteurForm";

export default async function NewSecteurPage() {
  await requireAdminSession();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/secteurs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux secteurs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau secteur</h1>
        <p className="text-gray-500 text-sm mt-1">Créer un nouveau secteur géographique</p>
      </div>
      <SecteurForm mode="create" />
    </div>
  );
}
