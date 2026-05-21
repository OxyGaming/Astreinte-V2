/**
 * idb-offline — File d'attente persistante pour les actions effectuées hors ligne.
 *
 * Deux object stores dans la même base IndexedDB :
 *   - `pending_ops`        : file d'attente des mutations (POST/PATCH) à rejouer
 *                            au retour de connexion (sessions de fiche, sessions
 *                            de procédure, contributions à la main courante).
 *   - `procedure_sessions` : état complet des sessions de procédure, pour que le
 *                            wizard puisse s'afficher et progresser hors ligne
 *                            même après un rechargement de page.
 *
 * Pourquoi pas localStorage : capacité limitée (~5 Mo) et accès synchrone bloquant.
 * IndexedDB est asynchrone, supporte plusieurs Mo et résiste mieux aux purges navigateur.
 *
 * NOTE : Module client-only. Importer uniquement depuis des composants 'use client'
 * ou via dynamic import — toute utilisation côté serveur lèvera ReferenceError.
 */

import type { SessionProcedureMetier, ValeurReponse } from "@/lib/procedure/types";

const DB_NAME = "astreinte-offline";
// v2 : ajout du store `procedure_sessions`. L'upgrade est idempotent (cf. openDb).
const DB_VERSION = 2;
const STORE = "pending_ops";
const PROC_STORE = "procedure_sessions";

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type PendingActionPayload = {
  etapeOrdre: number;
  actionIndex: number;
  actionLabel: string;
  type: "checked" | "unchecked";
};

export type PendingCommentPayload = {
  message: string;
};

export type PendingSessionCreatePayload = {
  ficheTitre: string;
};

export type PendingProcReponsePayload = {
  etapeId: string;
  actionId: string;
  valeur: ValeurReponse;
};

export type PendingProcAvancerPayload = {
  etapeIndex: number;
};

export type PendingMainCourantePayload = {
  nature?: string;
  libelle?: string;
  description: string;
  solution?: string;
  ficheSlug?: string;
};

// ─── File d'attente : opérations en attente ───────────────────────────────────

export type PendingOp =
  | {
      id?: number;
      // clientOpId : UUID v4 généré à l'enfilement, transmis au serveur en header
      // ou body de chaque tentative pour qu'il rejette les rejeux après ack perdu.
      clientOpId: string;
      kind: "action";
      sessionId: string;
      ficheSlug: string;
      payload: PendingActionPayload;
      userId: string;
      userNom: string;
      userPrenom: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "comment";
      sessionId: string;
      ficheSlug: string;
      payload: PendingCommentPayload;
      userId: string;
      userNom: string;
      userPrenom: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "session-create";
      // sessionId = identifiant local synthétique ("local-<uuid>") qui sera remplacé
      // par l'ID serveur après drain via remapSessionId(localId, realId).
      sessionId: string;
      ficheSlug: string;
      payload: PendingSessionCreatePayload;
      userId: string;
      userNom: string;
      userPrenom: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "proc-session-create";
      // sessionId = identifiant local "local-proc-<uuid>", remappé après drain.
      sessionId: string;
      procedureSlug: string;
      posteId: string;
      agentNom?: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "proc-reponse";
      sessionId: string;
      payload: PendingProcReponsePayload;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "proc-avancer";
      sessionId: string;
      payload: PendingProcAvancerPayload;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "proc-complete";
      sessionId: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "proc-abandonner";
      sessionId: string;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id?: number;
      clientOpId: string;
      kind: "main-courante-create";
      // Pas de sessionId : op autonome, drainée par OfflineSyncManager (global).
      payload: PendingMainCourantePayload;
      createdAt: number;
      attempts: number;
      lastError?: string;
    };

/**
 * Omit distributif : applique Omit à CHAQUE membre de l'union séparément.
 * `Omit<Union, K>` natif ne conserve que les clés communes à tous les membres
 * — inadapté à une union de formes hétérogènes comme PendingOp.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Nom de l'événement diffusé après chaque mutation pour rafraîchir les badges
 *  globaux (OfflineIndicator, PendingOpsBadge, …). Évite le polling permanent. */
export const IDB_CHANGE_EVENT = "astreinte:idb-changed";

function notifyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(IDB_CHANGE_EVENT));
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponible (SSR ou navigateur non supporté)"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Création idempotente : couvre l'install initiale ET l'upgrade v1 → v2.
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("by_session", "sessionId");
      }
      if (!db.objectStoreNames.contains(PROC_STORE)) {
        db.createObjectStore(PROC_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDb().then((db) =>
    new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );
}

// ─── File d'attente : API ─────────────────────────────────────────────────────

/**
 * Enfile une op. `clientOpId` est généré ici si absent — utilisé par le serveur
 * pour dédupliquer les rejeux (ack perdu, drain concurrent, double-clic en ligne).
 */
export async function enqueue(
  op: DistributiveOmit<PendingOp, "id" | "clientOpId"> & { clientOpId?: string }
): Promise<number> {
  const clientOpId = op.clientOpId ?? crypto.randomUUID();
  const id = await tx<IDBValidKey>(STORE, "readwrite", (s) => s.add({ ...op, clientOpId }));
  notifyChange();
  return Number(id);
}

export async function getAll(): Promise<PendingOp[]> {
  return tx<PendingOp[]>(STORE, "readonly", (s) => s.getAll() as IDBRequest<PendingOp[]>);
}

export async function getBySession(sessionId: string): Promise<PendingOp[]> {
  return openDb().then((db) =>
    new Promise<PendingOp[]>((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const idx = t.objectStore(STORE).index("by_session");
      const req = idx.getAll(sessionId);
      req.onsuccess = () => resolve(req.result as PendingOp[]);
      req.onerror = () => reject(req.error);
    })
  );
}

export async function remove(id: number): Promise<void> {
  await tx(STORE, "readwrite", (s) => s.delete(id));
  notifyChange();
}

export async function update(op: PendingOp): Promise<void> {
  if (op.id === undefined) throw new Error("update() requires an op with id");
  await tx(STORE, "readwrite", (s) => s.put(op));
  notifyChange();
}

export async function count(): Promise<number> {
  return tx<number>(STORE, "readonly", (s) => s.count());
}

export async function countBySession(sessionId: string): Promise<number> {
  return openDb().then((db) =>
    new Promise<number>((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const idx = t.objectStore(STORE).index("by_session");
      const req = idx.count(sessionId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );
}

export async function clear(): Promise<void> {
  await tx(STORE, "readwrite", (s) => s.clear());
  notifyChange();
}

/**
 * Remplace toutes les occurrences de `oldSessionId` par `newSessionId` dans la file.
 * Utilisé après le drain d'une op `session-create` / `proc-session-create` pour
 * réaffecter les ops dépendantes créées avec un ID local au véritable ID serveur.
 *
 * Renvoie le nombre d'ops modifiées.
 */
export async function remapSessionId(oldSessionId: string, newSessionId: string): Promise<number> {
  if (oldSessionId === newSessionId) return 0;
  const ops = await getBySession(oldSessionId);
  let updated = 0;
  for (const op of ops) {
    if (op.id === undefined) continue;
    // Les ops sans sessionId (main-courante) ne sont jamais indexées par session.
    if (op.kind === "main-courante-create") continue;
    await update({ ...op, sessionId: newSessionId });
    updated++;
  }
  return updated;
}

// ─── Store des sessions de procédure (état complet, rendu hors ligne) ─────────
//
// Permet au wizard de procédure de fonctionner sans réseau : l'état complet
// (snapshot + réponses + étape courante) est persisté à chaque mutation et relu
// au montage si l'API est injoignable.

/** Persiste (insert/update) l'état complet d'une session de procédure. */
export async function saveProcedureSession(session: SessionProcedureMetier): Promise<void> {
  await tx(PROC_STORE, "readwrite", (s) => s.put(session));
}

/** Lit l'état d'une session de procédure depuis le cache local. */
export async function getProcedureSession(id: string): Promise<SessionProcedureMetier | null> {
  const row = await tx<SessionProcedureMetier | undefined>(
    PROC_STORE,
    "readonly",
    (s) => s.get(id) as IDBRequest<SessionProcedureMetier | undefined>
  );
  return row ?? null;
}

/** Supprime une session de procédure du cache local. */
export async function deleteProcedureSession(id: string): Promise<void> {
  await tx(PROC_STORE, "readwrite", (s) => s.delete(id));
}

/**
 * Re-clé une session de procédure locale vers son véritable ID serveur après
 * promotion (drain de l'op `proc-session-create`).
 */
export async function remapProcedureSession(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  const existing = await getProcedureSession(oldId);
  if (!existing) return;
  await saveProcedureSession({ ...existing, id: newId });
  await deleteProcedureSession(oldId);
}
