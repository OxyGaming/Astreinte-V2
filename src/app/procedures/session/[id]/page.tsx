/**
 * /procedures/session/[id]
 * Page du wizard : charge le poste + les contacts nécessaires (pour les enrichissements UI),
 * puis passe la main au composant client ProcedureWizard.
 */

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProcedureWizard from "@/components/procedure/ProcedureWizard";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Charger la session (lecture minimale côté serveur pour les enrichissements)
  const session = await prisma.sessionProcedure.findUnique({
    where: { id },
    select: {
      id: true,
      procedureSnapshot: true,
      posteSlug: true,
      statut: true,
    },
  });

  if (!session) notFound();

  // Extraire tous les contactIds référencés dans le snapshot pour les résoudre
  let snapshot: { etapes: { actions: { contactId?: string }[] }[] } = { etapes: [] };
  try {
    snapshot = JSON.parse(session.procedureSnapshot);
  } catch {
    // snapshot corrompu, le wizard affichera une erreur
  }

  const contactIds = new Set<string>();
  for (const etape of snapshot.etapes ?? []) {
    for (const action of etape.actions ?? []) {
      if (action.contactId) contactIds.add(action.contactId);
    }
  }

  // Résoudre les contacts → map contactId → telephone
  const contactsIndex: Record<string, string> = {};
  if (contactIds.size > 0) {
    const contacts = await prisma.contact.findMany({
      where: { id: { in: [...contactIds] } },
      select: { id: true, telephone: true },
    });
    for (const c of contacts) {
      contactsIndex[c.id] = c.telephone;
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ProcedureWizard sessionId={id} contactsIndex={contactsIndex} />
    </div>
  );
}
