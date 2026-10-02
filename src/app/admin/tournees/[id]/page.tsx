import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileDown } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllLiens } from "@/lib/db";
import { parseLienRefs } from "@/lib/liens";
import LiensEditor from "@/components/admin/LiensEditor";
import { parseAPropos, parseContacts, parseSeuils } from "@/lib/tournee/parse";
import ModeleInfosForm from "./ModeleInfosForm";
import TourneeEtapesEditor from "./TourneeEtapesEditor";
import DeleteModeleButton from "./DeleteModeleButton";
import { toEditor } from "./editor-types";

export const dynamic = "force-dynamic";

export default async function AdminTourneeModelePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const [modele, liensCollection] = await Promise.all([
    prisma.tourneeModele.findUnique({
      where: { id },
      include: {
        etapes: {
          orderBy: { ordre: "asc" },
          include: { photos: { where: { kind: "PHOTO" }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }] } },
        },
        _count: { select: { realisations: true } },
      },
    }),
    getAllLiens(),
  ]);
  if (!modele) notFound();

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <Link href="/admin/tournees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft size={14} /> Tournées terrain
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{modele.titre}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Version {modele.version} · {modele._count.realisations} réalisation(s). Les réalisations déjà lancées conservent
            leur copie du parcours : vos modifications ne s&apos;appliquent qu&apos;aux prochaines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/tournees/modeles/${modele.id}/pdf`} target="_blank" rel="noopener"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            <FileDown size={14} /> PDF
          </a>
          <Link href={`/tournees/modeles/${modele.id}`}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            <ExternalLink size={14} /> Vue terrain
          </Link>
          <DeleteModeleButton id={modele.id} titre={modele.titre} realisations={modele._count.realisations} />
        </div>
      </div>

      <div className="space-y-6">
        <ModeleInfosForm
          initial={{
            id: modele.id,
            titre: modele.titre,
            sousTitre: modele.sousTitre,
            description: modele.description,
            objectif: modele.objectif,
            heureDepart: modele.heureDepart,
            mentionDiffusion: modele.mentionDiffusion,
            statut: modele.statut,
            seuils: parseSeuils(modele.seuils),
            aPropos: parseAPropos(modele.aPropos),
            contacts: parseContacts(modele.contacts),
          }}
        />
        <TourneeEtapesEditor
          modeleId={modele.id}
          heureDepart={modele.heureDepart}
          initialEtapes={modele.etapes.map(toEditor)}
          collection={liensCollection}
        />
        <LiensEditor
          endpoint={`/api/admin/tournees/${modele.id}/liens-utiles`}
          initialEntries={parseLienRefs(modele.liens)}
          collection={liensCollection}
        />
      </div>
    </div>
  );
}
