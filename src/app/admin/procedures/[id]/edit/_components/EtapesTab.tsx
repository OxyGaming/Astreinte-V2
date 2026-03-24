"use client";
import type { ProcedureForm, EtapeForm } from "@/lib/procedure/form-types";
import { emptyEtape, makeKey } from "@/lib/procedure/form-types";
import EtapeCard from "./EtapeCard";
import { Plus } from "lucide-react";

interface Props {
  form: ProcedureForm;
  onChange: (form: ProcedureForm) => void;
}

export default function EtapesTab({ form, onChange }: Props) {
  const updateEtape = (index: number, etape: EtapeForm) => {
    const etapes = [...form.etapes];
    etapes[index] = etape;
    onChange({ ...form, etapes });
  };

  const deleteEtape = (index: number) => {
    if (!confirm("Supprimer cette étape et toutes ses actions ?")) return;
    const etapes = form.etapes.filter((_, i) => i !== index);
    onChange({ ...form, etapes });
  };

  const moveEtape = (index: number, direction: -1 | 1) => {
    const etapes = [...form.etapes];
    const target = index + direction;
    if (target < 0 || target >= etapes.length) return;
    [etapes[index], etapes[target]] = [etapes[target], etapes[index]];
    onChange({ ...form, etapes });
  };

  const duplicateEtape = (index: number) => {
    const source = form.etapes[index];
    const existingEtapeIds = form.etapes.map((e) => e.id);
    const existingActionIds = form.etapes.flatMap((e) => e.actions.map((a) => a.id));
    const newEtape: EtapeForm = {
      ...source,
      _key: makeKey(),
      id: (() => {
        let n = 1;
        while (existingEtapeIds.includes(`${source.id}-${n}`)) n++;
        return `${source.id}-${n}`;
      })(),
      titre: `${source.titre} (copie)`,
      actions: source.actions.map((action) => {
        let newId = `${action.id}-copy`;
        let n = 2;
        while (existingActionIds.includes(newId)) newId = `${action.id}-copy-${n++}`;
        existingActionIds.push(newId);
        return { ...action, _key: makeKey(), id: newId };
      }),
    };
    const etapes = [...form.etapes];
    etapes.splice(index + 1, 0, newEtape);
    onChange({ ...form, etapes });
  };

  const addEtape = () => {
    const existingIds = form.etapes.map((e) => e.id);
    onChange({ ...form, etapes: [...form.etapes, emptyEtape(existingIds)] });
  };

  return (
    <div className="space-y-3">
      {form.etapes.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          Aucune étape — ajoutez-en une pour commencer.
        </div>
      )}

      {form.etapes.map((etape, i) => (
        <EtapeCard
          key={etape._key}
          etape={etape}
          index={i}
          total={form.etapes.length}
          allActionIds={form.etapes.flatMap((e) => e.actions.map((a) => a.id))}
          onUpdate={(e) => updateEtape(i, e)}
          onDelete={() => deleteEtape(i)}
          onMoveUp={() => moveEtape(i, -1)}
          onMoveDown={() => moveEtape(i, 1)}
          onDuplicate={() => duplicateEtape(i)}
        />
      ))}

      <button
        onClick={addEtape}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <Plus size={16} />
        Ajouter une étape
      </button>
    </div>
  );
}
