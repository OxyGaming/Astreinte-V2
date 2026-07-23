import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertTeamAccess, getSessionUser } from "@/lib/auth";
import { resolveTriangleLinks } from "@/lib/db";
import RciEditorClient from "./RciEditorClient";

export const dynamic = "force-dynamic";

export default async function RciEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await getSessionUser();
  if (!u) redirect("/login");
  const rci = await prisma.rci.findUnique({
    where: { id },
    // Portage : ni `Team` ni `Photo` dans cette application.
    include: {
      author: { select: { id: true, nom: true, prenom: true } },
      // Source terrain rattachée — sert l'encart de navigation et la reprise.
      cilIncident: {
        select: {
          id: true,
          reference: true,
          lieu: true,
          type: true,
          typeLibre: true,
          status: true,
          occurredAt: true,
        },
      },
      session: {
        select: {
          id: true,
          ficheTitre: true,
          ficheSlug: true,
          status: true,
          startedAt: true,
        },
      },
    },
  });
  if (!rci) notFound();
  // Cloisonnement par auteur. `notFound()` — et non un 403 — pour ne pas
  // révéler l'existence d'une ressource appartenant à un autre utilisateur.
  if (!assertTeamAccess(u, rci)) notFound();
  // Voisins du triangle pour le bandeau « Modules liés » (résolution transitive :
  // la session atteinte via le CIL compte aussi). Distinct de « Sources terrain »
  // du wizard, qui reste sur le rattachement direct + reprise.
  const triangle = await resolveTriangleLinks({ rciId: rci.id });
  return (
    <RciEditorClient
      linkedCil={triangle.cil}
      linkedSession={triangle.session}
      rci={{
        id: rci.id,
        status: rci.status,
        title: rci.title,
        dossierNumber: rci.dossierNumber,
        eventAt: rci.eventAt?.toISOString() ?? null,
        payload: rci.payload,
        authorName: `${rci.author.prenom} ${rci.author.nom}`.trim(),
        updatedAt: rci.updatedAt.toISOString(),
        cilIncident: rci.cilIncident
          ? {
              id: rci.cilIncident.id,
              reference: rci.cilIncident.reference,
              lieu: rci.cilIncident.lieu,
              type: rci.cilIncident.type,
              typeLibre: rci.cilIncident.typeLibre,
              status: rci.cilIncident.status,
              occurredAt: rci.cilIncident.occurredAt.toISOString(),
            }
          : null,
        session: rci.session
          ? {
              id: rci.session.id,
              ficheTitre: rci.session.ficheTitre,
              ficheSlug: rci.session.ficheSlug,
              status: rci.session.status,
              startedAt: rci.session.startedAt.toISOString(),
            }
          : null,
      }}
    />
  );
}
