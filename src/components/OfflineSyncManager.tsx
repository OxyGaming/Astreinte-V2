"use client";

/**
 * OfflineSyncManager — drain global des opérations hors ligne « autonomes ».
 *
 * Composant sans rendu, monté une fois dans le layout. Il rejoue les ops qui
 * ne sont rattachées à aucune page particulière — aujourd'hui les contributions
 * à la main courante (`main-courante-create`).
 *
 * Les ops de session (fiche / procédure) sont drainées par leur composant
 * respectif (FicheSessionView / ProcedureWizard) car elles dépendent d'un
 * remap d'identifiant local → serveur et de l'état React de la session.
 *
 * Déclenchement : au montage + à chaque retour réseau (`online`). Pas d'écoute
 * de IDB_CHANGE_EVENT — un échec persistant boucle l'événement `update`.
 */

import { useEffect } from "react";
import { getAll, remove, update } from "@/lib/idb-offline";

// Verrou module-scope : empêche deux drains simultanés dans le même onglet.
let draining = false;

async function drainMainCourante(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  draining = true;
  try {
    let ops;
    try {
      ops = await getAll();
    } catch {
      return; // IndexedDB indisponible — silencieux
    }
    const mcOps = ops.filter((o) => o.kind === "main-courante-create");

    for (const op of mcOps) {
      if (op.id === undefined) continue;
      try {
        const res = await fetch("/api/main-courante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...op.payload, clientOpId: op.clientOpId }),
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          // 2xx : appliqué. 4xx : payload rejeté définitivement — on retire
          // pour ne pas bloquer la file (le serveur ne l'acceptera jamais).
          await remove(op.id);
        } else {
          // 5xx : serveur en difficulté — on retentera au prochain retour réseau.
          await update({ ...op, attempts: op.attempts + 1, lastError: `HTTP ${res.status}` });
          break;
        }
      } catch (err) {
        // Erreur réseau — on s'arrête, retry au prochain `online`.
        await update({ ...op, attempts: op.attempts + 1, lastError: String(err) });
        break;
      }
    }
  } finally {
    draining = false;
  }
}

export default function OfflineSyncManager() {
  useEffect(() => {
    drainMainCourante();
    const onOnline = () => drainMainCourante();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}
