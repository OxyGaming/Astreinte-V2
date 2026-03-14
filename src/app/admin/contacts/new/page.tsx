import { requireAdminSession } from "@/lib/admin-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ContactForm from "../ContactForm";

export default async function NewContactPage() {
  await requireAdminSession();
  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/contacts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau contact</h1>
      </div>
      <ContactForm mode="create" />
    </div>
  );
}
