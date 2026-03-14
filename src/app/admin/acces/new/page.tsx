import { requireAdminSession } from "@/lib/admin-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AccesForm from "../AccesForm";

export default async function NewAccesPage() {
  await requireAdminSession();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin/acces"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Retour aux points d&apos;accès
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau point d&apos;accès</h1>
        <p className="text-gray-500 text-sm mt-1">Ajouter un point d&apos;accès ferroviaire manuellement</p>
      </div>
      <AccesForm mode="create" />
    </div>
  );
}
