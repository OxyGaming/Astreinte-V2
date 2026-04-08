import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import SecteurForm from "./SecteurForm";
import SecteurPointsAccesEditor from "./SecteurPointsAccesEditor";
import SecteurProceduresEditor from "./SecteurProceduresEditor";
import SecteurPNEditor from "./SecteurPNEditor";
import type { PointAcces, Procedure, PassageNiveau } from "@/lib/types";

function parsePointsAcces(raw: string): PointAcces[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).nom !== "string") return [];
    return parsed as PointAcces[];
  } catch {
    return [];
  }
}

function parseProcedures(raw: string): Procedure[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).titre !== "string") return [];
    return parsed as Procedure[];
  } catch {
    return [];
  }
}

function parsePNSecteur(raw: string | null): PassageNiveau[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).numero !== "string") return [];
    return parsed as PassageNiveau[];
  } catch {
    return [];
  }
}

interface Props { params: Promise<{ id: string }> }

export default async function EditSecteurPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const secteur = await prisma.secteur.findUnique({
    where: { id },
    include: {
      fiches: { include: { fiche: { select: { id: true, titre: true, slug: true } } } },
      postes: { include: { poste: { select: { id: true, nom: true } } } },
    },
  });

  if (!secteur) notFound();

  const initialPointsAcces = parsePointsAcces(secteur.pointsAcces);
  const initialProcedures = parseProcedures(secteur.procedures);
  const initialPN = parsePNSecteur(secteur.pn);

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
      <div className="max-w-3xl space-y-8">
        <SecteurForm mode="edit" secteur={secteur} fichesLiees={secteur.fiches} />
        <SecteurPointsAccesEditor secteurId={secteur.id} initialEntries={initialPointsAcces} />
        <SecteurProceduresEditor secteurId={secteur.id} initialEntries={initialProcedures} />
        <SecteurPNEditor secteurId={secteur.id} initialEntries={initialPN} />
      </div>
    </div>
  );
}
