"use client";
import { useState } from "react";
import type { EtapeForm, ActionForm } from "@/lib/procedure/form-types";
import { emptyAction, actionIdFromLabel, makeKey, ICONE_OPTIONS } from "@/lib/procedure/form-types";
import ActionCard from "./ActionCard";
import { ChevronDown, ChevronUp, ChevronRight, Copy, Trash2, Plus } from "lucide-react";

interface Props {
  etape: EtapeForm;
  index: number;
  total: number;
  allActionIds: string[];
  onUpdate: (etape: EtapeForm) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

export default function EtapeCard({
  etape, index, total, allActionIds,
  onUpdate, onDelete, onMoveUp, onMoveDown, onDuplicate,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const set = (key: keyof EtapeForm, value: unknown) => onUpdate({ ...etape, [key]: value });

  const addAction = () => {
    const newAction = emptyAction(allActionIds);
    onUpdate({ ...etape, actions: [...etape.actions, newAction] });
  };

  const updateAction = (i: number, action: ActionForm) => {
    const actions = [...etape.actions];
    actions[i] = action;
    onUpdate({ ...etape, actions });
  };

  const deleteAction = (i: number) => {
    if (!confirm("Supprimer cette action ?")) return;
    onUpdate({ ...etape, actions: etape.actions.filter((_, idx) => idx !== i) });
  };

  const moveAction = (i: number, direction: -1 | 1) => {
    const actions = [...etape.actions];
    const target = i + direction;
    if (target < 0 || target >= actions.length) return;
    [actions[i], actions[target]] = [actions[target], actions[i]];
    onUpdate({ ...etape, actions });
  };

  const duplicateAction = (i: number) => {
    const source = etape.actions[i];
    const currentIds = [...allActionIds];
    let newId = `${source.id}-copy`;
    let n = 2;
    while (currentIds.includes(newId)) newId = `${source.id}-copy-${n++}`;
    const newAction: ActionForm = { ...source, _key: makeKey(), id: newId };
    const actions = [...etape.actions];
    actions.splice(i + 1, 0, newAction);
    onUpdate({ ...etape, actions });
  };

  // actionIdFromLabel is available if needed for future use
  void actionIdFromLabel;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 border-b border-gray-200">
        <span className="text-xs font-mono text-gray-400 w-6 text-center">{index + 1}</span>

        {/* Icone */}
        <select
          value={etape.icone}
          onChange={(e) => set("icone", e.target.value)}
          className="text-xs border-0 bg-transparent text-gray-500 focus:outline-none cursor-pointer"
          title="Icône"
        >
          {ICONE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Titre étape */}
        <input
          type="text"
          value={etape.titre}
          onChange={(e) => set("titre", e.target.value)}
          placeholder="Titre de l'étape…"
          className="flex-1 bg-transparent text-sm font-semibold text-gray-800 focus:outline-none placeholder:text-gray-400"
        />

        {/* ID */}
        <span className="text-xs font-mono text-gray-400 px-2 py-0.5 bg-gray-100 rounded">{etape.id}</span>

        {/* Actions header */}
        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded" title="Monter">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded" title="Descendre">
            <ChevronDown size={14} />
          </button>
          <button onClick={onDuplicate} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Dupliquer">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Supprimer">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded ml-1">
            <ChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Description étape */}
          <input
            type="text"
            value={etape.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Description de l'étape (optionnelle)…"
            className="w-full text-sm text-gray-600 border-b border-gray-200 pb-1 focus:outline-none focus:border-blue-400"
          />

          {/* Actions */}
          <div className="space-y-2">
            {etape.actions.map((action, i) => (
              <ActionCard
                key={action._key}
                action={action}
                index={i}
                total={etape.actions.length}
                allActionIds={allActionIds.filter((id) => id !== action.id)}
                onUpdate={(a) => updateAction(i, a)}
                onDelete={() => deleteAction(i)}
                onMoveUp={() => moveAction(i, -1)}
                onMoveDown={() => moveAction(i, 1)}
                onDuplicate={() => duplicateAction(i)}
              />
            ))}

            <button
              onClick={addAction}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <Plus size={13} />
              Ajouter une action
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
