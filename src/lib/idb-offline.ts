/**
 * idb-offline — File d'attente persistante pour les actions effectuées hors ligne.
 *
 * Stocke les requêtes POST (toggle d'action, commentaire) dans IndexedDB
 * pour qu'elles puissent être rejouées au retour de connexion, même après
 * un rechargement complet de l'application.
 *
 * Pourquoi pas localStorage : capacité limitée (~5 Mo) et accès synchrone bloquant.
 * IndexedDB est asynchrone, supporte plusieurs Mo et résiste mieux aux purges navigateur.
 *
 * NOTE : Module client-only. Importer uniquement depuis des composants 'use client'
 * ou via dynamic import — toute utilisation côté serveur lèvera ReferenceError.
 */

const DB_NAME = "astreinte-offline";
const DB_VERSION = 1;
const STORE = "pending_ops";

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

export type PendingOp =
  | {
      id?: number;
      // clientOpId : UUID v4 généré à l'enfilement, transmis au serveur en header
      // de chaque tentative pour qu'il rejette les rejeux après ack perdu.
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
    };

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
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("by_session", "sessionId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) =>
    new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );
}

/**
 * Enfile une op. `clientOpId` est généré ici si absent — utilisé par le serveur
 * pour dédupliquer les rejeux (ack perdu, drain concurrent, double-clic en ligne).
 */
export async function enqueue(op: Omit<PendingOp, "id" | "clientOpId"> & { clientOpId?: string }): Promise<number> {
  const clientOpId = op.clientOpId ?? crypto.randomUUID();
  const id = await tx<IDBValidKey>("readwrite", (s) => s.add({ ...op, clientOpId }));
  notifyChange();
  return Number(id);
}

export async function getAll(): Promise<PendingOp[]> {
  return tx<PendingOp[]>("readonly", (s) => s.getAll() as IDBRequest<PendingOp[]>);
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
  await tx("readwrite", (s) => s.delete(id));
  notifyChange();
}

export async function update(op: PendingOp): Promise<void> {
  if (op.id === undefined) throw new Error("update() requires an op with id");
  await tx("readwrite", (s) => s.put(op));
  notifyChange();
}

export async function count(): Promise<number> {
  return tx<number>("readonly", (s) => s.count());
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
  await tx("readwrite", (s) => s.clear());
  notifyChange();
}

/**
 * Remplace toutes les occurrences de `oldSessionId` par `newSessionId` dans la file.
 * Utilisé après le drain d'une op `session-create` pour réaffecter les ops
 * `action` / `comment` créées avec un ID local au véritable ID serveur.
 *
 * Renvoie le nombre d'ops modifiées.
 */
export async function remapSessionId(oldSessionId: string, newSessionId: string): Promise<number> {
  if (oldSessionId === newSessionId) return 0;
  const ops = await getBySession(oldSessionId);
  let updated = 0;
  for (const op of ops) {
    if (op.id === undefined) continue;
    await update({ ...op, sessionId: newSessionId });
    updated++;
  }
  return updated;
}
