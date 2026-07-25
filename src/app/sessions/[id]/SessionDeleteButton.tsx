"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useDeletionDialog } from "@/components/DeletionImpactDialog";

/**
 * Bouton de suppression physique d'une session (admin-only). Rendu uniquement
 * pour un ADMIN par la page serveur. Après suppression réussie, redirige vers la
 * liste des sessions (la ressource n'existe plus).
 */
export default function SessionDeleteButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { dialog, requestDelete } = useDeletionDialog(() => router.push("/sessions"));

  return (
    <>
      {dialog}
      <button
        type="button"
        onClick={() => requestDelete({ type: "session", id: sessionId })}
        className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-lg transition-colors"
        title="Supprimer la session"
      >
        <Trash2 size={14} />
        Supprimer
      </button>
    </>
  );
}
