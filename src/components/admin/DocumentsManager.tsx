"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, Download, AlertTriangle, Loader2 } from "lucide-react";

interface DocumentRow {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string | Date;
}

interface Props {
  target: { ficheId: string } | { posteId: string };
  initialDocuments: DocumentRow[];
}

const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DocumentsManager({ target, initialDocuments }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setError(null);

    if (file.type !== "application/pdf") {
      setError("Type de fichier non autorisé. PDF uniquement.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(`Fichier trop volumineux (${formatSize(file.size)}). Max 10 Mo.`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if ("ficheId" in target) formData.append("ficheId", target.ficheId);
      else formData.append("posteId", target.posteId);

      const res = await fetch("/api/admin/documents", { method: "POST", body: formData });
      const data = await parseJsonOrThrow(res, file.size);
      if (!res.ok) {
        const errMsg = typeof data === "object" && data && "error" in data ? String((data as { error: unknown }).error) : `Erreur ${res.status}`;
        throw new Error(errMsg);
      }

      setDocuments((prev) => [data as DocumentRow, ...prev]);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  }

  /**
   * Parse la réponse en JSON ou produit une erreur lisible.
   * Cas spécial 413 (Request Entity Too Large) renvoyé en HTML par Nginx :
   * détection via status + content-type ou via le texte brut.
   */
  async function parseJsonOrThrow(res: Response, uploadedSize: number): Promise<unknown> {
    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      return res.json();
    }
    const text = await res.text();
    if (res.status === 413 || /413|too large|entity too large/i.test(text)) {
      throw new Error(
        `Fichier rejeté par le serveur (${formatSize(uploadedSize)}). ` +
        `Limite probablement appliquée par le reverse proxy (Nginx). ` +
        `Vérifiez la directive client_max_body_size.`,
      );
    }
    throw new Error(`Réponse inattendue du serveur (HTTP ${res.status}). Vérifiez les logs.`);
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Supprimer le document "${doc.originalName}" ? Cette action est irréversible.`)) return;
    setDeletingId(doc.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 text-base flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            Documents (PDF)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Documents téléchargeables par les utilisateurs depuis la fiche / le poste. PDF uniquement, max 10 Mo.
          </p>
        </div>
        <label
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors ${
            uploading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Envoi…" : "Ajouter un PDF"}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg">
          Aucun document. Cliquez sur « Ajouter un PDF » pour en téléverser un.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {documents.map((doc) => {
            const isDeleting = deletingId === doc.id;
            return (
              <li key={doc.id} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50">
                <FileText size={18} className="text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.originalName}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(doc.size)} · ajouté le {formatDate(doc.createdAt)}
                  </p>
                </div>
                <a
                  href={`/api/documents/${doc.id}/download?inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md hover:bg-blue-50"
                >
                  <Download size={13} />
                  Voir
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={isDeleting}
                  className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-md disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {isDeleting ? "…" : "Supprimer"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
