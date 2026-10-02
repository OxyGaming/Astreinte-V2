// ⚠️  Fichier serveur uniquement (utilise fs/path). Pour les helpers de
// formatage utilisables côté client, voir `./document-formatters.ts`.
import path from "path";
import fs from "fs/promises";

export const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
export const DOCUMENT_ALLOWED_MIME = ["application/pdf"] as const;

/** Photos (tournées terrain) : redimensionnées côté client, JPEG/PNG uniquement
 *  (formats embarquables tels quels dans les PDF générés). */
export const PHOTO_MAX_SIZE = 8 * 1024 * 1024; // 8 MB
export const PHOTO_ALLOWED_MIME = ["image/jpeg", "image/png"] as const;

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Dossier racine de stockage des documents (hors `public/`, géré par .gitignore). */
export function getDocumentsDir(): string {
  return path.join(process.cwd(), "uploads", "documents");
}

/** Nom de fichier sur disque : `<id>.<ext>` (ext déduite du type MIME). */
export function documentFilename(id: string, mimeType = "application/pdf"): string {
  return `${id}.${EXT_BY_MIME[mimeType] ?? "bin"}`;
}

/** Chemin absolu du fichier sur disque pour un document donné. */
export function getDocumentPath(id: string, mimeType = "application/pdf"): string {
  return path.join(getDocumentsDir(), documentFilename(id, mimeType));
}

export async function ensureDocumentsDir(): Promise<void> {
  await fs.mkdir(getDocumentsDir(), { recursive: true });
}

/** Supprime le fichier physique (silencieux si déjà absent). */
export async function unlinkDocumentFile(id: string, mimeType?: string): Promise<void> {
  try {
    await fs.unlink(getDocumentPath(id, mimeType));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`[documents] Échec suppression fichier ${id}:`, err);
    }
  }
}

// Re-export pour rétrocompatibilité des imports existants côté serveur.
export { formatFileSize, formatDocumentDate } from "./document-formatters";
