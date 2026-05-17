"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet, Upload, ChevronLeft, Info, AlertTriangle,
  CheckCircle2, Loader2, X, Eye, FileX, BookMarked,
} from "lucide-react";

interface ParsedRow {
  rowIndex: number; // index dans la feuille (1-based, en-tête = 1)
  titre?: string;
  nature?: string;
  libelle?: string;
  description: string;
  solution?: string;
  avisSecurite?: string;
  avisProduction?: string;
  ficheSlug?: string;
  warnings: string[];
  errors: string[];
}

interface ImportSummary {
  created: number;
  updated: number;
  rejected: number;
  details: { status: string; row?: number; reason?: string }[];
}

// Aliases acceptés pour les colonnes (en-têtes Excel insensibles à la casse/accents)
const COLUMN_ALIASES: Record<keyof Omit<ParsedRow, "rowIndex" | "warnings" | "errors">, string[]> = {
  titre: ["titre", "title"],
  nature: ["nature", "code"],
  libelle: ["libelle", "libellé", "categorie", "catégorie"],
  description: ["description", "situation", "cas"],
  solution: ["solution", "reponse", "réponse"],
  avisSecurite: ["avis securite", "avis sécurité", "avissecurite", "avis_securite"],
  avisProduction: ["avis production", "avisproduction", "avis_production"],
  ficheSlug: ["fiche", "fiche_slug", "ficheslug", "slug_fiche"],
};

function normalizeHeader(h: string): string {
  return h
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function mapHeaders(headers: string[]): Record<string, keyof typeof COLUMN_ALIASES | undefined> {
  const map: Record<string, keyof typeof COLUMN_ALIASES | undefined> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        map[h] = key as keyof typeof COLUMN_ALIASES;
        break;
      }
    }
  }
  return map;
}

async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  // Prend la première feuille (souvent "Export")
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Le fichier ne contient aucune feuille.");
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });

  if (rows.length === 0) {
    throw new Error(`La feuille « ${sheetName} » est vide.`);
  }

  const headers = Object.keys(rows[0]);
  const headerMap = mapHeaders(headers);
  const knownHeaders = Object.values(headerMap).filter(Boolean);

  if (!knownHeaders.includes("description")) {
    throw new Error(
      "Colonne DESCRIPTION introuvable. Vérifiez que la feuille contient une colonne nommée \"DESCRIPTION\"."
    );
  }

  const parsed: ParsedRow[] = [];
  rows.forEach((raw, idx) => {
    const out: ParsedRow = {
      rowIndex: idx + 2, // +2 car en-tête = ligne 1, données commencent en 2
      description: "",
      warnings: [],
      errors: [],
    };

    for (const [header, value] of Object.entries(raw)) {
      const field = headerMap[header];
      if (!field) continue;
      const str = String(value ?? "").trim();
      if (str === "") continue;
      (out as Record<string, string>)[field] = str;
    }

    // Validation
    if (!out.description) {
      out.errors.push("Description manquante");
    }

    // Filtrer les lignes "métadonnées" Excel (cellules de filtre stockées en fin de feuille)
    // Heuristique : si description très longue avec "Filtres appliqués" → ignorer.
    if (out.description.length > 0 && /filtres appliqu/i.test(out.description)) {
      out.errors.push("Ligne de métadonnées Excel (filtre)");
    }

    parsed.push(out);
  });

  return parsed;
}

export default function MainCouranteImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<"create" | "upsert">("upsert");

  async function handleFile(file: File) {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls")) {
      setParseError("Seuls les fichiers .xlsx et .xls sont acceptés.");
      return;
    }
    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    setRows([]);
    setResult(null);
    try {
      const parsed = await parseExcelFile(file);
      setRows(parsed);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur de lecture du fichier.");
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function reset() {
    setRows([]);
    setParseError(null);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  async function handleImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import/main-courante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: validRows.map((r) => ({
            titre: r.titre,
            nature: r.nature,
            libelle: r.libelle,
            description: r.description,
            solution: r.solution,
            avisSecurite: r.avisSecurite,
            avisProduction: r.avisProduction,
            ficheSlug: r.ficheSlug,
          })),
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'import.");
      setResult(data);
      setRows([]);
      setFileName("");
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur serveur.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/main-courante"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Main courante
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked size={20} className="text-green-600" />
          Importer une main courante (Excel)
        </h1>
      </div>

      {/* Aide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 text-sm text-blue-800">
          <p className="font-semibold mb-1">Format attendu</p>
          <p className="mb-2">
            Première feuille du fichier <code className="bg-blue-100 px-1.5 rounded text-xs">.xlsx</code>,
            avec ces colonnes (l&apos;ordre n&apos;importe pas, en-têtes insensibles à la casse) :
          </p>
          <ul className="space-y-0.5 text-xs">
            <li>• <strong>DESCRIPTION</strong> (obligatoire) — situation rencontrée</li>
            <li>• <strong>NATURE</strong> — code court (ex : S1, S9, RH)</li>
            <li>• <strong>LIBELLE</strong> — catégorie longue (ex : Signaux)</li>
            <li>• <strong>SOLUTION</strong> — ce qui a été fait</li>
            <li>• <strong>AVIS SECURITE</strong> — avis de la filière sécurité</li>
            <li>• <strong>AVIS PRODUCTION</strong> — avis de la filière production</li>
            <li>• <strong>TITRE</strong> et <strong>FICHE</strong> (slug) — optionnels</li>
          </ul>
          <p className="mt-2 text-xs">
            Toutes les entrées importées sont automatiquement <strong>validées</strong> avec vous comme auteur/validateur.
          </p>
        </div>
      </div>

      {/* Résultat */}
      {result && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 mb-1">Import terminé</p>
              <div className="flex gap-4 text-sm mb-2">
                <span className="text-green-700"><strong>{result.created}</strong> créée(s)</span>
                <span className="text-blue-700"><strong>{result.updated}</strong> mise(s) à jour</span>
                <span className="text-red-700"><strong>{result.rejected}</strong> rejetée(s)</span>
              </div>
              {result.details.filter((d) => d.status === "rejected").length > 0 && (
                <ul className="text-xs text-red-600 space-y-0.5 mt-2">
                  {result.details.filter((d) => d.status === "rejected").map((d, i) => (
                    <li key={i}>• Ligne {d.row} : {d.reason}</li>
                  ))}
                </ul>
              )}
              <button onClick={reset} className="mt-2 text-sm text-green-700 underline hover:no-underline">
                Importer un autre fichier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone de dépôt */}
      {rows.length === 0 && !result && (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-green-300 hover:bg-green-50/40"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          {parsing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={28} className="text-green-500 animate-spin" />
              <p className="text-gray-600 text-sm">Analyse du fichier en cours…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Upload size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-700">Déposez votre fichier Excel ici</p>
                <p className="text-xs text-gray-400 mt-1">ou cliquez pour choisir (.xlsx, .xls)</p>
              </div>
            </div>
          )}
        </div>
      )}

      {parseError && (
        <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Erreur</p>
            <p>{parseError}</p>
            <button onClick={reset} className="mt-1 underline hover:no-underline text-xs">Réessayer</button>
          </div>
        </div>
      )}

      {/* Aperçu */}
      {rows.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">
                <strong>{rows.length}</strong> ligne(s) dans{" "}
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{fileName}</span>
                {" "}—{" "}
                <span className="text-green-600">{validRows.length} valide(s)</span>
                {invalidRows.length > 0 && (
                  <span className="text-red-500 ml-2">{invalidRows.length} ignorée(s)</span>
                )}
              </p>
            </div>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X size={13} /> Recommencer
            </button>
          </div>

          {/* Options d'import */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-6 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Mode d&apos;import :</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="upsert" checked={mode === "upsert"} onChange={() => setMode("upsert")} className="text-blue-600" />
              <span className="text-sm text-gray-700">Créer + mettre à jour (recommandé)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="create" checked={mode === "create"} onChange={() => setMode("create")} className="text-blue-600" />
              <span className="text-sm text-gray-700">Créer uniquement (peut produire des doublons)</span>
            </label>
          </div>

          {/* Tableau aperçu */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-12">#</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Nature</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Libellé</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Champs</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-32">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => {
                  const hasError = r.errors.length > 0;
                  const fieldCount =
                    (r.titre ? 1 : 0) +
                    (r.solution ? 1 : 0) +
                    (r.avisSecurite ? 1 : 0) +
                    (r.avisProduction ? 1 : 0) +
                    (r.ficheSlug ? 1 : 0);
                  return (
                    <tr key={i} className={hasError ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">{r.rowIndex}</td>
                      <td className="px-3 py-2">
                        {r.nature ? (
                          <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-bold px-1.5 py-0.5 rounded">
                            {r.nature}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-xs">
                        {r.libelle || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-700 truncate max-w-md" title={r.description}>
                        {r.description.length > 100 ? r.description.slice(0, 100) + "…" : r.description}
                      </td>
                      <td className="px-3 py-2 text-xs text-center text-gray-500">
                        +{fieldCount}
                      </td>
                      <td className="px-3 py-2">
                        {hasError ? (
                          <div className="flex items-start gap-1.5">
                            <FileX size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              {r.errors.map((e, j) => (
                                <p key={j} className="text-xs text-red-600">{e}</p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 size={13} /> Valide
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bouton d'import */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {importing ? (
                <><Loader2 size={15} className="animate-spin" /> Import en cours…</>
              ) : (
                <><Upload size={15} /> Importer {validRows.length} entrée(s)</>
              )}
            </button>
            {invalidRows.length > 0 && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle size={14} />
                {invalidRows.length} ligne(s) ignorée(s)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Note bas de page */}
      <div className="mt-8 text-xs text-gray-400 flex items-center gap-2">
        <FileSpreadsheet size={12} />
        Le parser détecte automatiquement les colonnes Nature, Libellé, Description, Solution, Avis sécurité, Avis production, Titre et Fiche.
      </div>
    </div>
  );
}
