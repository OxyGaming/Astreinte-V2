import path from "path";
import fs from "fs/promises";

export const DOCUMENT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
export const DOCUMENT_ALLOWED_MIME = ["application/pdf"] as const;

/** Dossier racine de stockage des documents (hors `public/`, géré par .gitignore). */
export function getDocumentsDir(): string {
  return path.join(process.cwd(), "uploads", "documents");
}

/** Chemin absolu du fichier sur disque pour un document donné. */
export function getDocumentPath(id: string): string {
  return path.join(getDocumentsDir(), `${id}.pdf`);
}

export async function ensureDocumentsDir(): Promise<void> {
  await fs.mkdir(getDocumentsDir(), { recursive: true });
}

/** Formate une taille en octets en chaîne lisible (Ko / Mo). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}
