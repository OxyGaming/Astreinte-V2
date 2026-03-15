"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet, Upload, ChevronLeft, Info, AlertTriangle,
  CheckCircle2, Download, Loader2, X, Eye, FileX
} from "lucide-react";

interface Contact { id: string; nom: string; categorie: string }
interface Secteur { id: string; slug: string; nom: string }

interface FicheRow {
  numero: string | number;
  slug: string;
  titre: string;
  categorie: string;
  priorite: string;
  mnemonique: string;
  resume: string;
  references: string;
  avis_obligatoires: string;
}

interface EtapeRow {
  slug_fiche: string;
  ordre: string | number;
  titre: string;
  description: string;
  critique: string;
}

interface ActionRow {
  slug_fiche: string;
  ordre_etape: string | number;
  ordre_action: string | number;
  texte: string;
}

interface ContactRow {
  slug_fiche: string;
  nom_contact: string;
}

interface SecteurRow {
  slug_fiche: string;
  nom_secteur: string;
}

interface ParsedFiche {
  slug: string;
  numero: number;
  titre: string;
  categorie: string;
  priorite: string;
  mnemonique: string;
  resume: string;
  references: string[];
  avisObligatoires: string[];
  etapes: { ordre: number; titre: string; description: string; critique: boolean; actions: string[] }[];
  contactIds: string[];
  secteurIds: string[];
  warnings: string[];
  errors: string[];
}

interface ImportSummary {
  created: number;
  updated: number;
  rejected: number;
  details: { slug: string; status: "created" | "updated" | "rejected"; reason?: string }[];
}

interface Props {
  contacts: Contact[];
  secteurs: Secteur[];
}

// ─── Parsing Excel (côté client via SheetJS CDN-like import) ──────────────

async function parseExcelFile(
  file: File,
  contacts: Contact[],
  secteurs: Secteur[]
): Promise<ParsedFiche[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  function getSheet<T>(name: string): T[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<T>(ws, { defval: "" });
  }

  const fichesRows = getSheet<FicheRow>("Fiches");
  const etapesRows = getSheet<EtapeRow>("Etapes");
  const actionsRows = getSheet<ActionRow>("Actions");
  const contactsRows = getSheet<ContactRow>("Contacts_lies");
  const secteursRows = getSheet<SecteurRow>("Secteurs_lies");

  if (fichesRows.length === 0) {
    throw new Error("L'onglet « Fiches » est vide ou introuvable. Vérifiez que vous utilisez le bon modèle.");
  }

  const CATEGORIES = ["accident", "incident", "securite", "gestion-agent", "evacuation"];
  const PRIORITES = ["urgente", "normale"];

  return fichesRows.map((row): ParsedFiche => {
    const warnings: string[] = [];
    const errors: string[] = [];

    const slug = String(row.slug || "").trim();
    const titre = String(row.titre || "").trim();
    const numero = Number(row.numero);
    const categorie = String(row.categorie || "").trim().toLowerCase();
    const priorite = String(row.priorite || "urgente").trim().toLowerCase();
    const mnemonique = String(row.mnemonique || "").trim();
    const resume = String(row.resume || "").trim();
    const refsRaw = String(row.references || "").trim();
    const avisRaw = String(row.avis_obligatoires || "").trim();

    if (!titre) errors.push("Titre manquant");
    if (!slug) errors.push("Slug manquant");
    if (!numero || isNaN(numero)) errors.push("Numéro invalide ou manquant");
    if (!resume) errors.push("Résumé manquant");
    if (!CATEGORIES.includes(categorie)) {
      errors.push(`Catégorie invalide "${categorie}" (valeurs : ${CATEGORIES.join(", ")})`);
    }
    if (!PRIORITES.includes(priorite)) {
      warnings.push(`Priorité "${priorite}" invalide → "urgente" utilisée par défaut`);
    }

    const references = refsRaw ? refsRaw.split("|").map((s) => s.trim()).filter(Boolean) : [];
    const avisObligatoires = avisRaw ? avisRaw.split("|").map((s) => s.trim()).filter(Boolean) : [];

    // Étapes pour cette fiche
    const ficheEtapes = etapesRows
      .filter((e) => String(e.slug_fiche || "").trim() === slug)
      .sort((a, b) => Number(a.ordre) - Number(b.ordre));

    if (ficheEtapes.length === 0) {
      warnings.push("Aucune étape trouvée pour cette fiche");
    }

    const etapes = ficheEtapes.map((e) => {
      const ordre = Number(e.ordre);
      const critiqueStr = String(e.critique || "").toLowerCase();
      const critique = critiqueStr === "oui" || critiqueStr === "true" || critiqueStr === "1";

      // Actions pour cette étape
      const ficheActions = actionsRows
        .filter(
          (a) =>
            String(a.slug_fiche || "").trim() === slug &&
            Number(a.ordre_etape) === ordre
        )
        .sort((a, b) => Number(a.ordre_action) - Number(b.ordre_action))
        .map((a) => String(a.texte || "").trim())
        .filter(Boolean);

      return {
        ordre,
        titre: String(e.titre || "").trim(),
        description: String(e.description || "").trim(),
        critique,
        actions: ficheActions,
      };
    });

    // Contacts liés
    const ficheContactRows = contactsRows.filter(
      (c) => String(c.slug_fiche || "").trim() === slug
    );
    const contactIds: string[] = [];
    for (const cr of ficheContactRows) {
      const nomSearch = String(cr.nom_contact || "").trim().toLowerCase();
      if (!nomSearch) continue;
      const found = contacts.find(
        (c) => c.nom.toLowerCase().includes(nomSearch) || nomSearch.includes(c.nom.toLowerCase())
      );
      if (found) {
        contactIds.push(found.id);
      } else {
        warnings.push(`Contact introuvable : "${cr.nom_contact}"`);
      }
    }

    // Secteurs liés
    const ficheSecteurRows = secteursRows.filter(
      (s) => String(s.slug_fiche || "").trim() === slug
    );
    const secteurIds: string[] = [];
    for (const sr of ficheSecteurRows) {
      const nomSearch = String(sr.nom_secteur || "").trim().toLowerCase();
      if (!nomSearch) continue;
      const found = secteurs.find(
        (s) =>
          s.nom.toLowerCase().includes(nomSearch) ||
          s.slug.toLowerCase() === nomSearch.replace(/\s+/g, "-")
      );
      if (found) {
        secteurIds.push(found.id);
      } else {
        warnings.push(`Secteur introuvable : "${sr.nom_secteur}"`);
      }
    }

    return {
      slug,
      numero,
      titre,
      categorie: CATEGORIES.includes(categorie) ? categorie : "incident",
      priorite: PRIORITES.includes(priorite) ? priorite : "urgente",
      mnemonique,
      resume,
      references,
      avisObligatoires,
      etapes,
      contactIds,
      secteurIds,
      warnings,
      errors,
    };
  });
}

// ─── Composant principal ──────────────────────────────────────────────────

export default function FichesImportClient({ contacts, secteurs }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fiches, setFiches] = useState<ParsedFiche[]>([]);
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
    setFiches([]);
    setResult(null);
    try {
      const parsed = await parseExcelFile(file, contacts, secteurs);
      setFiches(parsed);
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
    setFiches([]);
    setParseError(null);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const validFiches = fiches.filter((f) => f.errors.length === 0);
  const invalidFiches = fiches.filter((f) => f.errors.length > 0);

  async function handleImport() {
    if (validFiches.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/import/fiches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiches: validFiches, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'import.");
      setResult(data);
      setFiches([]);
      setFileName("");
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Erreur serveur.");
    } finally {
      setImporting(false);
    }
  }

  const CATEGORIE_LABELS: Record<string, string> = {
    accident: "Accident",
    incident: "Incident",
    securite: "Sécurité",
    "gestion-agent": "Gestion agent",
    evacuation: "Évacuation",
  };

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/import"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Import
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-green-600" />
          Import de fiches réflexes (Excel)
        </h1>
      </div>

      {/* Étape 1 : Télécharger le modèle */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">1</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 mb-1">Téléchargez le modèle Excel</p>
            <p className="text-sm text-gray-500 mb-3">
              Ce fichier contient tous les onglets et colonnes nécessaires, avec des exemples et des instructions.
            </p>
            <a
              href="/api/admin/import/template"
              download="modele_fiches_astreinte.xlsx"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={15} />
              Télécharger le modèle Excel
            </a>
          </div>
        </div>
      </div>

      {/* Étape 2 : Aide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-start gap-3">
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600">2</div>
        <div className="flex-1">
          <p className="font-semibold text-blue-800 mb-2">Remplissez le fichier Excel</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Onglet <strong>Fiches</strong> : une ligne = une fiche (numéro, titre, résumé…)</li>
            <li>• Onglet <strong>Etapes</strong> : une ligne = une étape, reliée à une fiche par son slug</li>
            <li>• Onglet <strong>Actions</strong> : une ligne = une action, reliée à une étape</li>
            <li>• Onglets <strong>Contacts_lies</strong> et <strong>Secteurs_lies</strong> : liens optionnels</li>
            <li>• Consultez l&apos;onglet <strong>Aide</strong> du fichier pour les valeurs autorisées</li>
          </ul>
        </div>
      </div>

      {/* Étape 3 : Importer */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-500">3</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 mb-3">Importez votre fichier complété</p>

            {/* Résultat */}
            {result && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4">
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
                      <ul className="text-xs text-red-600 space-y-0.5">
                        {result.details.filter((d) => d.status === "rejected").map((d, i) => (
                          <li key={i}>• {d.slug} : {d.reason}</li>
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
            {fiches.length === 0 && !result && (
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
          </div>
        </div>
      </div>

      {/* Aperçu des fiches parsées */}
      {fiches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">
                <strong>{fiches.length}</strong> fiche(s) dans{" "}
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{fileName}</span>
                {" "}—{" "}
                <span className="text-green-600">{validFiches.length} valide(s)</span>
                {invalidFiches.length > 0 && (
                  <span className="text-red-500 ml-2">{invalidFiches.length} avec erreur(s)</span>
                )}
              </p>
            </div>
            <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <X size={13} /> Recommencer
            </button>
          </div>

          {/* Options d'import */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-6">
            <span className="text-sm font-medium text-gray-700">Mode d&apos;import :</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="upsert" checked={mode === "upsert"} onChange={() => setMode("upsert")}
                className="text-blue-600" />
              <span className="text-sm text-gray-700">Créer + mettre à jour (recommandé)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="create" checked={mode === "create"} onChange={() => setMode("create")}
                className="text-blue-600" />
              <span className="text-sm text-gray-700">Créer uniquement (rejeter si existant)</span>
            </label>
          </div>

          {/* Tableau des fiches */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-28">Catégorie</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-20">Étapes</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600 w-20">Actions</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fiches.map((f, i) => (
                  <tr key={i} className={f.errors.length > 0 ? "bg-red-50/40" : "hover:bg-gray-50/60"}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.numero || "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-xs">{f.titre || <span className="text-red-400 italic">Sans titre</span>}</p>
                      <p className="text-xs text-gray-400 font-mono">{f.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {CATEGORIE_LABELS[f.categorie] || f.categorie}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">{f.etapes.length}</td>
                    <td className="px-3 py-3 text-center text-sm text-gray-600">
                      {f.etapes.reduce((s, e) => s + e.actions.length, 0)}
                    </td>
                    <td className="px-3 py-3">
                      {f.errors.length > 0 ? (
                        <div className="flex items-start gap-1.5">
                          <FileX size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            {f.errors.map((e, j) => (
                              <p key={j} className="text-xs text-red-600">{e}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <CheckCircle2 size={13} /> Valide
                          </div>
                          {f.warnings.length > 0 && (
                            <div className="mt-0.5">
                              {f.warnings.map((w, j) => (
                                <p key={j} className="text-xs text-amber-600 flex items-center gap-1">
                                  <Info size={11} className="flex-shrink-0" /> {w}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bouton d'import */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleImport}
              disabled={importing || validFiches.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {importing ? (
                <><Loader2 size={15} className="animate-spin" /> Import en cours…</>
              ) : (
                <><Upload size={15} /> Importer {validFiches.length} fiche(s) valide(s)</>
              )}
            </button>
            {invalidFiches.length > 0 && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle size={14} />
                {invalidFiches.length} fiche(s) avec erreurs seront ignorées
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
