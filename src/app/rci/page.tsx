import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, teamScope } from "@/lib/auth";
import RciListClient from "./RciListClient";

export const dynamic = "force-dynamic";

export default async function RciIndexPage() {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  const rcis = await prisma.rci.findMany({
    where: { ...teamScope(u) },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    // Portage : ni `Team` ni `Photo` dans cette application.
    include: {
      author: { select: { id: true, nom: true, prenom: true } },
    },
  });
  const items = rcis.map((r) => ({
    id: r.id,
    status: r.status,
    title: r.title,
    dossierNumber: r.dossierNumber,
    eventAt: r.eventAt?.toISOString() ?? null,
    updatedAt: r.updatedAt.toISOString(),
    authorName: `${r.author.prenom} ${r.author.nom}`.trim(),
  }));
  return <RciListClient items={items} />;
}
