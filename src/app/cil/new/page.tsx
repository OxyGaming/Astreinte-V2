import { redirect } from "next/navigation";
import { getSessionUser, assertTeamAccess } from "@/lib/auth";
import { getSessionById } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { canAccessSession } from "@/lib/user-auth";
import NewCilClient from "./NewCilClient";

export const dynamic = "force-dynamic";

export default async function NewCilPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; rciId?: string }>;
}) {
  const u = await getSessionUser();
  if (!u) redirect("/login");

  const { sessionId, rciId } = await searchParams;

  // Livret démarré depuis une session : on le rattache et on préremplit la date
  // de l'événement. On ne pré-lie qu'une session que l'utilisateur peut voir.
  let linkedSession: { id: string; startedAt: string } | null = null;
  if (sessionId) {
    const s = await getSessionById(sessionId);
    if (s && canAccessSession(u, s)) {
      linkedSession = { id: s.id, startedAt: s.startedAt };
    }
  }

  // Livret démarré depuis un RCI : on rattache le RCI et on préremplit la date
  // depuis l'événement du RCI s'il est renseigné.
  let linkedRci: { id: string; eventAt: string | null } | null = null;
  if (rciId && !linkedSession) {
    const rci = await prisma.rci.findUnique({
      where: { id: rciId },
      select: { id: true, authorId: true, eventAt: true },
    });
    if (rci && assertTeamAccess(u, rci)) {
      linkedRci = { id: rci.id, eventAt: rci.eventAt?.toISOString() ?? null };
    }
  }

  return (
    <NewCilClient
      defaultCilName={u.name}
      sessionId={linkedSession?.id ?? null}
      rciId={linkedRci?.id ?? null}
      defaultOccurredAt={
        linkedSession?.startedAt ?? linkedRci?.eventAt ?? null
      }
    />
  );
}
