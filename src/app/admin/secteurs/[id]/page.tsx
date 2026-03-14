import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import SecteurForm from "./SecteurForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditSecteurPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const secteur = await prisma.secteur.findUnique({
    where: { id },
    include: {
      fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } },
      postes: { select: { id: true, nom: true } },
    },
  });

  if (!secteur) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/secteurs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft size={16} /> Retour aux secteurs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{secteur.nom}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Ligne {secteur.ligne} · {secteur.fiches.length} fiche(s) liée(s) · {secteur.postes.length} poste(s) lié(s)
            </p>
          </div>
          <Link
            href={`/secteurs/${secteur.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 px-3 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <ExternalLink size={13} />
            Voir dans l&apos;app
          </Link>
        </div>
      </div>
      <SecteurForm mode="edit" secteur={secteur} fichesLiees={secteur.fiches} />
    </div>
  );
}
