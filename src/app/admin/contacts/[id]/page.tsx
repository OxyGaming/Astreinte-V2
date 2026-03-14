import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ContactForm from "../ContactForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditContactPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } } },
  });

  if (!contact) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/contacts" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier : {contact.nom}</h1>
        <p className="text-gray-500 text-sm mt-1">Identifiant : {contact.id}</p>
      </div>
      <ContactForm mode="edit" contact={contact} />
    </div>
  );
}
