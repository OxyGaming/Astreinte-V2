import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import FicheForm from "../FicheForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditFichePage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const [fiche, contacts, secteurs] = await Promise.all([
    prisma.fiche.findUnique({
      where: { id },
      include: {
        contacts: { include: { contact: { select: { id: true, nom: true, categorie: true } } } },
        secteurs: { include: { secteur: { select: { id: true, nom: true, ligne: true } } } },
      },
    }),
    prisma.contact.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, categorie: true } }),
    prisma.secteur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ligne: true } }),
  ]);

  if (!fiche) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/fiches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux fiches
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fiche #{fiche.numero} — {fiche.titre}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {fiche.contacts.length} contact(s) lié(s) · {fiche.secteurs.length} secteur(s) lié(s)
            </p>
          </div>
          <Link
            href={`/fiches/${fiche.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <ExternalLink size={13} />
            Voir dans l&apos;app
          </Link>
        </div>
      </div>
      <FicheForm
        mode="edit"
        fiche={{
          ...fiche,
          contacts: fiche.contacts.map((fc) => ({ contactId: fc.contactId, contact: fc.contact })),
          secteurs: fiche.secteurs.map((fs) => ({ secteurId: fs.secteurId, secteur: fs.secteur })),
        }}
        contacts={contacts}
        secteurs={secteurs}
      />
    </div>
  );
}
