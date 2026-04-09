"use client";
import { useState } from "react";
import type { ActionForm } from "@/lib/procedure/form-types";
import { TYPE_ACTION_OPTIONS, NIVEAU_OPTIONS, actionIdFromLabel, slugify } from "@/lib/procedure/form-types";
import { ChevronDown, ChevronUp, ChevronRight, Copy, Trash2, Pencil, Lock } from "lucide-react";
import ContactPicker from "./ContactPicker";

interface Props {
  action: ActionForm;
  index: number;
  total: number;
  allActionIds: string[]; // all action ids EXCEPT this one
  onUpdate: (action: ActionForm) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  information: "bg-blue-100 text-blue-700",
  question_oui_non: "bg-green-100 text-green-700",
  question_choix: "bg-purple-100 text-purple-700",
  saisie_texte: "bg-amber-100 text-amber-700",
  confirmation: "bg-gray-100 text-gray-700",
  contact_recherche: "bg-teal-100 text-teal-700",
};

export default function ActionCard({
  action, index, total, allActionIds,
  onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [idEditing, setIdEditing] = useState(false);
  const [newChoix, setNewChoix] = useState("");

  const set = <K extends keyof ActionForm>(key: K, value: ActionForm[K]) =>
    onUpdate({ ...action, [key]: value });

  // On type change: reset incompatible fields
  const handleTypeChange = (type: ActionForm["type"]) => {
    const updates: Partial<ActionForm> = { type };
    if (type === "information") {
      updates.obligatoire = false;
      updates.niveau = "informatif";
      updates.reponseAttendue = null;
    }
    if (type === "contact_recherche") {
      updates.niveau = "informatif";
      updates.reponseAttendue = null;
      updates.reponsesDisponibles = [];
    }
    if (type === "saisie_texte" && action.niveau === "bloquant") {
      updates.niveau = "alerte";
    }
    if (type !== "question_oui_non" && type !== "question_choix") {
      updates.reponseAttendue = null;
    }
    if (type !== "question_choix") {
      updates.reponsesDisponibles = [];
    }
    if (type !== "confirmation") {
      updates.contactId = "";
      updates.referenceDoc = "";
    }
    if (type !== "contact_recherche") {
      updates.filtreCategorieContact = "";
    }
    onUpdate({ ...action, ...updates });
  };

  const handleLabelBlur = () => {
    if (!action.id && action.label.trim()) {
      const newId = actionIdFromLabel(action.label, allActionIds);
      set("id", newId);
    }
  };

  const addChoix = () => {
    const val = newChoix.trim();
    if (!val || action.reponsesDisponibles.includes(val)) return;
    set("reponsesDisponibles", [...action.reponsesDisponibles, val]);
    setNewChoix("");
  };

  const removeChoix = (val: string) => {
    set("reponsesDisponibles", action.reponsesDisponibles.filter((v) => v !== val));
    if (action.reponseAttendue === val) set("reponseAttendue", null);
  };

  const typeLabel = TYPE_ACTION_OPTIONS.find((o) => o.value === action.type)?.label ?? action.type;
  const typeColor = TYPE_COLORS[action.type] ?? "bg-gray-100 text-gray-700";

  // Niveau options — bloquant disabled for information, saisie_texte, contact_recherche
  const niveauDisabled =
    action.type === "information" ||
    action.type === "saisie_texte" ||
    action.type === "contact_recherche";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <span className="text-xs text-gray-400 w-5 text-center">{index + 1}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
        <span className="flex-1 text-sm text-gray-700 truncate">
          {action.label || <span className="text-gray-400 italic">Action sans label</span>}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Monter"><ChevronUp size={13} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title="Descendre"><ChevronDown size={13} /></button>
          <button onClick={onDuplicate} className="p-1 text-gray-400 hover:text-blue-600" title="Dupliquer"><Copy size={13} /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 size={13} /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-gray-400 hover:text-gray-600 ml-1">
            <ChevronRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Type + Niveau */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
              <select
                value={action.type}
                onChange={(e) => handleTypeChange(e.target.value as ActionForm["type"])}
                className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TYPE_ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Niveau</label>
              <select
                value={action.niveau}
                onChange={(e) => set("niveau", e.target.value as ActionForm["niveau"])}
                disabled={niveauDisabled}
                className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {NIVEAU_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.value === "bloquant" && niveauDisabled}>
                    {o.label}{o.value === "bloquant" && niveauDisabled ? " (indisponible)" : ""}
                  </option>
                ))}
              </select>
              {action.type === "saisie_texte" && (
                <p className="text-xs text-amber-600 mt-1">V1 : saisie texte ne peut pas être bloquante (pas d&apos;évaluation automatique)</p>
              )}
              {action.type === "contact_recherche" && (
                <p className="text-xs text-teal-600 mt-1">Toujours informatif — la sélection d&apos;un contact n&apos;est pas évaluable comme bonne/mauvaise réponse</p>
              )}
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Label *</label>
            <input
              type="text"
              value={action.label}
              onChange={(e) => set("label", e.target.value)}
              onBlur={handleLabelBlur}
              placeholder="Question ou instruction affichée à l'agent…"
              className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* ID */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ID action</label>
            <div className="flex items-center gap-2">
              {idEditing ? (
                <input
                  type="text"
                  value={action.id}
                  onChange={(e) => set("id", slugify(e.target.value) || e.target.value)}
                  onBlur={() => setIdEditing(false)}
                  autoFocus
                  className="flex-1 rounded border border-blue-400 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <span className="flex-1 px-2.5 py-1.5 bg-gray-50 rounded border border-gray-200 text-xs font-mono text-gray-600">
                  {action.id || <span className="text-gray-400 italic">généré au premier label</span>}
                </span>
              )}
              <button
                onClick={() => setIdEditing(!idEditing)}
                className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded"
                title={idEditing ? "Verrouiller" : "Modifier"}
              >
                {idEditing ? <Lock size={12} /> : <Pencil size={12} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Stable après création — modifiez manuellement si nécessaire.</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description <span className="font-normal text-gray-400">(optionnelle)</span></label>
            <input
              type="text"
              value={action.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Contexte complémentaire affiché en gris sous le label…"
              className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Note de vigilance <span className="font-normal text-gray-400">(optionnelle)</span></label>
            <input
              type="text"
              value={action.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Affiché en orange — réf. réglementaire, point de vigilance…"
              className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Champs conditionnels selon type */}

          {/* question_oui_non : réponse attendue */}
          {action.type === "question_oui_non" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Réponse attendue {action.niveau === "bloquant" && <span className="text-red-500">*</span>}
              </label>
              <div className="flex gap-2">
                {[{ val: true as boolean | null, label: "Oui" }, { val: false as boolean | null, label: "Non" }, { val: null as boolean | null, label: "Non définie" }].map((opt) => (
                  <label key={String(opt.val)} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`reponse-${action._key}`}
                      checked={action.reponseAttendue === opt.val}
                      onChange={() => set("reponseAttendue", opt.val)}
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* question_choix : choix disponibles + réponse attendue */}
          {action.type === "question_choix" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Choix disponibles *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {action.reponsesDisponibles.map((val) => (
                    <span key={val} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
                      {val}
                      <button onClick={() => removeChoix(val)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChoix}
                    onChange={(e) => setNewChoix(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addChoix())}
                    placeholder="Ajouter un choix…"
                    className="flex-1 rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={addChoix} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm rounded border border-gray-300">
                    Ajouter
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Réponse attendue {action.niveau === "bloquant" && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={String(action.reponseAttendue ?? "")}
                  onChange={(e) => set("reponseAttendue", e.target.value || null)}
                  className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Non définie —</option>
                  {action.reponsesDisponibles.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* contact_recherche : configuration */}
          {action.type === "contact_recherche" && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-3">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                Recherche contact — configuration
              </p>

              {/* Filtre catégorie */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Restreindre à une catégorie{" "}
                  <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <select
                  value={action.filtreCategorieContact}
                  onChange={(e) => set("filtreCategorieContact", e.target.value)}
                  className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">— Tous les contacts (recherche globale) —</option>
                  <option value="urgence">Urgences &amp; Opérations</option>
                  <option value="astreinte">Astreintes</option>
                  <option value="encadrement">Encadrement</option>
                  <option value="externe">Contacts externes</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Exemple : choisir &quot;Astreintes&quot; si l&apos;agent doit impérativement contacter un agent d&apos;astreinte.
                  Laisser vide si n&apos;importe quel contact peut convenir.
                </p>
              </div>

              {/* Rappel comportement */}
              <div className="rounded bg-teal-100 px-2.5 py-2 space-y-1">
                <p className="text-xs font-semibold text-teal-700">Ce que voit l&apos;agent :</p>
                <ul className="text-xs text-teal-600 space-y-0.5 list-disc list-inside">
                  <li>Un champ de recherche (nom, rôle)</li>
                  <li>Les résultats avec <strong>bouton d&apos;appel direct</strong> visible immédiatement</li>
                  <li>Après sélection : numéro principal, numéro fixe, disponibilité</li>
                  {action.obligatoire && (
                    <li className="font-semibold">La sélection est obligatoire pour passer à l&apos;étape suivante</li>
                  )}
                </ul>
              </div>

              {/* Avertissement si non obligatoire */}
              {!action.obligatoire && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  ⚠️ Action non obligatoire : l&apos;agent peut avancer sans sélectionner de contact.
                  Cochez &quot;Obligatoire&quot; si la sélection est requise.
                </p>
              )}
            </div>
          )}

          {/* confirmation : contactId + referenceDoc */}
          {action.type === "confirmation" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Contact à appeler{" "}
                  <span className="font-normal text-gray-400">
                    (affiche un bouton d&apos;appel dans la procédure)
                  </span>
                </label>
                <ContactPicker
                  value={action.contactId}
                  onChange={(id) => set("contactId", id)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Référence doc{" "}
                  <span className="font-normal text-gray-400">(badge réglementaire, optionnel)</span>
                </label>
                <input
                  type="text"
                  value={action.referenceDoc}
                  onChange={(e) => set("referenceDoc", e.target.value)}
                  placeholder="Ex : EIC RA DC 7291"
                  className="w-full rounded border border-gray-300 px-2.5 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Checkboxes obligatoire + verifiable */}
          <div className="flex items-center gap-6 pt-1">
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${action.type === "information" ? "opacity-40 cursor-not-allowed" : ""}`}>
              <input
                type="checkbox"
                checked={action.obligatoire}
                onChange={(e) => set("obligatoire", e.target.checked)}
                disabled={action.type === "information"}
              />
              <span className="text-gray-700">Obligatoire</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={action.verifiable}
                onChange={(e) => set("verifiable", e.target.checked)}
              />
              <span className="text-gray-700 flex items-center gap-1">
                Vérifiable
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">V2</span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
