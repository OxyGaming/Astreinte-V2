import { requireAdminSession } from "@/lib/admin-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AbrevForm from "../AbrevForm";

export default async function NewAbreviationPage() {
  await requireAdminSession();
  return (
    <div className="p-8">
      <Link href="/admin/abreviations" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={16} />Retour
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouvelle abréviation</h1>
      <AbrevForm mode="create" />
    </div>
  );
}
