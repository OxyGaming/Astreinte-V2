"use client";

/**
 * AnnuaireForm — modal d'ajout / édition d'une entrée d'annuaire.
 *
 * Deux modes :
 *   • Libre  : saisie manuelle (nom, fonction, téléphone, email, note, section)
 *   • Lié    : liaison à un contact du référentiel (ContactPicker)
 *              → nom/téléphone auto-remplis depuis la DB, toujours à jour
 */

import { useState, useEffect, useRef } from "react";
import { X, AlertTriangle, Link2, FileText, RefreshCw } from "lucide-react";
import type { AnnuaireEntry } from "@/lib/types";
import ContactPicker from "@/components/admin/ContactPicker";
import type { ContactOption } from "@/components/admin/ContactPicker";

interface Props {
  entry: AnnuaireEntry | null; // null = nouvelle entrée
  onSave: (entry: Omit<AnnuaireEntry, "ordre">) => void;
  onClose: () => void;
}

type Mode = "libre" | "lie";

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AnnuaireForm({ entry, onSave, onClose }: Props) {
  const nomRef = useRef<HTMLInputElement>(null);

  // Déterminer le mode initial
  const initialMode: Mode = entry?.contactId ? "lie" : "libre";
  const [mode, setMode] = useState<Mode>(initialMode);

  // ── État formulaire libre ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    section:   entry?.section   ?? "",
    nom:       entry?.nom       ?? "",
    fonction:  entry?.fonction  ?? "",
    telephone: entry?.telephone ?? "",
    email:     entry?.email     ?? "",
    note:      entry?.note      ?? "",
  });

  // ── État formulaire lié ────────────────────────────────────────────────────
  const [contactId, setContactId]   = useState(entry?.contactId ?? "");
  const [label, setLabel]           = useState(entry?.label ?? "");
  const [sectionLie, setSectionLie] = useState(entry?.section ?? "");
  const [noteLie, setNoteLie]       = useState(entry?.note ?? "");
  // Snapshot du contact sélectionné (pour prévisualisation et sauvegarde)
  const [contactSnap, setContactSnap] = useState<ContactOption | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "libre") setTimeout(() => nomRef.current?.focus(), 50);
  }, [mode]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function updateForm(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function handleContactChange(id: string, contact?: ContactOption) {
    setContactId(id);
    if (contact) setContactSnap(contact);
    if (!id) setContactSnap(null);
    if (errors.contactId) setErrors((prev) => { const n = { ...prev }; delete n.contactId; return n; });
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (mode === "libre") {
      if (!form.nom.trim()) errs.nom = "Le nom est obligatoire";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        errs.email = "Format email invalide";
    } else {
      if (!contactId) errs.contactId = "Sélectionnez un contact dans le référentiel";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Soumission ──────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (mode === "libre") {
      onSave({
        nom: form.nom.trim(),
        ...(form.section.trim()   ? { section:   form.section.trim()   } : {}),
        ...(form.fonction.trim()  ? { fonction:  form.fonction.trim()  } : {}),
        ...(form.telephone.trim() ? { telephone: form.telephone.trim() } : {}),
        ...(form.email.trim()     ? { email:     form.email.trim()     } : {}),
        ...(form.note.trim()      ? { note:      form.note.trim()      } : {}),
      });
    } else {
      // Entrée liée : on stocke le contactId + un snapshot nom/téléphone pour le fallback
      const snap = contactSnap;
      onSave({
        contactId,
        nom:       snap?.nom       ?? entry?.nom       ?? "",
        telephone: snap?.telephone ?? entry?.telephone ?? "",
        ...(label.trim()      ? { label:    label.trim()      } : {}),
        ...(sectionLie.trim() ? { section:  sectionLie.trim() } : {}),
        ...(noteLie.trim()    ? { note:     noteLie.trim()    } : {}),
      });
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900 text-base">
            {entry ? "Modifier l'entrée" : "Ajouter une entrée"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Sélecteur de mode ──────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Type d&apos;entrée
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("libre")}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  mode === "libre"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <FileText size={15} className="flex-shrink-0" />
                <div>
                  <p className="font-semibold">Entrée libre</p>
                  <p className="text-xs font-normal opacity-75">Saisie manuelle</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("lie")}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  mode === "lie"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Link2 size={15} className="flex-shrink-0" />
                <div>
                  <p className="font-semibold">Lier un contact</p>
                  <p className="text-xs font-normal opacity-75">Mise à jour auto</p>
                </div>
              </button>
            </div>

            {/* Info mode lié */}
            {mode === "lie" && (
              <div className="mt-2 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <RefreshCw size={13} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">
                  Les coordonnées seront automatiquement mises à jour si le contact est modifié dans le référentiel.
                </p>
              </div>
            )}
          </div>

          {/* ── Formulaire MODE LIBRE ──────────────────────────────────────── */}
          {mode === "libre" && (
            <div className="space-y-4">
              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Section <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.section}
                  onChange={(e) => updateForm("section", e.target.value)}
                  placeholder="ex : Gares encadrantes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nomRef}
                  type="text"
                  value={form.nom}
                  onChange={(e) => updateForm("nom", e.target.value)}
                  placeholder="ex : Jean Dupont"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nom ? "border-red-400 bg-red-50" : "border-gray-300"
                  }`}
                />
                {errors.nom && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} /> {errors.nom}
                  </p>
                )}
              </div>

              {/* Fonction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fonction <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.fonction}
                  onChange={(e) => updateForm("fonction", e.target.value)}
                  placeholder="ex : Aiguilleur chef"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Téléphone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={form.telephone}
                    onChange={(e) => updateForm("telephone", e.target.value)}
                    placeholder="04 78 XX XX XX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    placeholder="agent@sncf.fr"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Note <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => updateForm("note", e.target.value)}
                  placeholder="Informations complémentaires…"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Formulaire MODE LIÉ ────────────────────────────────────────── */}
          {mode === "lie" && (
            <div className="space-y-4">
              {/* Sélecteur de contact */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contact du référentiel <span className="text-red-500">*</span>
                </label>
                <ContactPicker value={contactId} onChange={handleContactChange} />
                {errors.contactId && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} /> {errors.contactId}
                  </p>
                )}
              </div>

              {/* Libellé personnalisé */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Libellé personnalisé{" "}
                  <span className="text-gray-400 font-normal text-xs">(remplace le nom du contact si renseigné)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={contactSnap?.nom ?? entry?.nom ?? "ex : Astreinte Gier"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Section <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={sectionLie}
                  onChange={(e) => setSectionLie(e.target.value)}
                  placeholder="ex : Astreintes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Note locale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Note locale{" "}
                  <span className="text-gray-400 font-normal text-xs">(spécifique à ce poste, optionnel)</span>
                </label>
                <textarea
                  value={noteLie}
                  onChange={(e) => setNoteLie(e.target.value)}
                  placeholder="ex : Appeler uniquement en semaine"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Aperçu de ce qui sera affiché */}
              {contactId && contactSnap && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                    Aperçu de l&apos;affichage
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {label.trim() || contactSnap.nom}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{contactSnap.role}</p>
                  <p className="text-xs font-mono text-blue-700 mt-1">{contactSnap.telephone}</p>
                  {contactSnap.telephoneAlt && (
                    <p className="text-xs font-mono text-gray-500">{contactSnap.telephoneAlt}</p>
                  )}
                  {noteLie && <p className="text-xs text-amber-700 mt-1">{noteLie}</p>}
                </div>
              )}
            </div>
          )}

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                mode === "lie"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {entry ? "Enregistrer" : "Ajouter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
