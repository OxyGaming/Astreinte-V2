/**
 * /procedures/session/[id]
 * Page du wizard : charge tous les contacts en une seule passe, puis passe la main
 * au composant client ProcedureWizard.
 *
 * Stratégie de chargement :
 * - On charge TOUS les contacts une seule fois (getAllContacts).
 * - On en dérive :
 *   • contactsIndex  : Record<string, string> id→telephone  (pour ActionConfirmation)
 *   • allContacts    : Contact[]                            (pour ActionContactRecherche)
 * Cela supprime la fragilité liée au scan du snapshot (contactId absent si snapshot
 * capturé avant ajout du contact, ou snapshot corrompu).
 */

export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAllContacts } from "@/lib/db";
import ProcedureWizard from "@/components/procedure/ProcedureWizard";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Vérifier que la session existe (lecture minimale)
  const session = await prisma.sessionProcedure.findUnique({
    where: { id },
    select: { id: true, statut: true },
  });

  if (!session) notFound();

  // Charger tous les contacts une seule fois
  const allContacts = await getAllContacts();

  // Construire l'index id→telephone pour enrichir ActionConfirmation
  const contactsIndex: Record<string, string> = {};
  for (const c of allContacts) {
    contactsIndex[c.id] = c.telephone;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ProcedureWizard
        sessionId={id}
        contactsIndex={contactsIndex}
        allContacts={allContacts}
      />
    </div>
  );
}
