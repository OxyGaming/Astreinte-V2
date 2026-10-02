import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import NewModeleForm from "./NewModeleForm";

export default async function NewTourneeModelePage() {
  await requireAdminSession();
  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <Link href="/admin/tournees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} />
        Tournées terrain
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouveau modèle de tournée</h1>
      <NewModeleForm />
    </div>
  );
}
