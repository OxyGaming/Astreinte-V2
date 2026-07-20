import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertTeamAccess, getSessionUser } from "@/lib/auth";
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
    },
  });
  if (!rci) notFound();
  // Cloisonnement par auteur. `notFound()` — et non un 403 — pour ne pas
  // révéler l'existence d'une ressource appartenant à un autre utilisateur.
  if (!assertTeamAccess(u, rci)) notFound();
  return (
    <RciEditorClient
      rci={{
        id: rci.id,
        status: rci.status,
        title: rci.title,
        dossierNumber: rci.dossierNumber,
        eventAt: rci.eventAt?.toISOString() ?? null,
        payload: rci.payload,
        authorName: `${rci.author.prenom} ${rci.author.nom}`.trim(),
        updatedAt: rci.updatedAt.toISOString(),
      }}
    />
  );
}
