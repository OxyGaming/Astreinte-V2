/**
 * /procedures/session/[id]
 * Coquille de la page wizard. Charge les données globales (contacts + liens),
 * identiques pour toute session, puis passe la main au composant client.
 *
 * IMPORTANT — compatibilité hors ligne :
 * L'identifiant de session n'est PAS lu ici (params) mais côté client, dans
 * ProcedureWizard via usePathname(). La sortie SSR est ainsi rigoureusement
 * identique pour toute session : le Service Worker peut mettre en cache une
 * coquille unique (/procedures/session/__shell__) et la servir pour n'importe
 * quelle URL de session lorsqu'on est hors ligne (y compris une session
 * démarrée hors ligne dont l'id n'a jamais existé côté serveur).
 *
 * L'existence de la session n'est donc PAS vérifiée côté serveur — c'est le
 * wizard (useSession) qui résout la session, via l'API ou le cache IndexedDB.
 */

export const dynamic = "force-dynamic";
import { getAllContacts, getAllLiens } from "@/lib/db";
import ProcedureWizard from "@/components/procedure/ProcedureWizard";

export default async function SessionPage() {
  // Contacts + collection de liens — données globales, indépendantes de la session.
  const [allContacts, liensCollection] = await Promise.all([getAllContacts(), getAllLiens()]);

  // Index id→telephone pour enrichir les actions de confirmation.
  const contactsIndex: Record<string, string> = {};
  for (const c of allContacts) {
    contactsIndex[c.id] = c.telephone;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <ProcedureWizard
        contactsIndex={contactsIndex}
        allContacts={allContacts}
        liensCollection={liensCollection}
      />
    </div>
  );
}
