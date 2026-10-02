"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Car } from "lucide-react";
import { construirePlanTheorique } from "@/lib/tournee/planning";
import { formatHHmm } from "@/lib/tournee/time";
import type { TourneePlan } from "@/lib/tournee/types";
import EtapeContenu from "@/components/tournee/EtapeContenu";
import { ETAPE_ICON } from "@/components/tournee/etape-ui";

/** Programme théorique d'un modèle, avec le détail dépliable de chaque étape. */
export default function ModeleTimeline({ plan, date }: { plan: TourneePlan; date: string }) {
  const th = useMemo(() => construirePlanTheorique(plan.etapes, date, plan.heureDepart), [plan, date]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ol className="card divide-y divide-slate-100">
      {plan.etapes.map((e, i) => {
        const t = th.byKey.get(e.key)!;
        const Icon = ETAPE_ICON[e.type];
        const isOpen = open === e.key;
        const suivanteObligatoire = plan.etapes.slice(i + 1).some((x) => !x.optionnelle);
        return (
          <li key={e.key}>
            <button onClick={() => setOpen(isOpen ? null : e.key)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
              <span className="w-[88px] flex-shrink-0 text-xs font-bold tabular-nums text-slate-700">
                {e.optionnelle ? (
                  <span className="text-amber-600">Optionnel</span>
                ) : (
                  <>
                    {formatHHmm(t.debut!)}
                    {e.dureeMin > 0 && <span className="font-normal text-slate-400"> – {formatHHmm(t.fin!)}</span>}
                  </>
                )}
              </span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                e.optionnelle ? "border border-dashed border-amber-300 text-amber-600" : "bg-blue-50 text-blue-700"
              }`}>
                <Icon size={15} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{e.titre}</span>
                {e.liens.length > 0 && <span className="block text-xs text-slate-400 truncate">{e.liens.map((l) => l.libelle).join(" · ")}</span>}
              </span>
              <ChevronDown size={16} className={`text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 bg-slate-50/60">
                <EtapeContenu etape={e} />
              </div>
            )}
            {!e.optionnelle && suivanteObligatoire && e.trajetSuivanteMin > 0 && (
              <p className="px-4 pb-2 -mt-1 pl-[124px] text-[11px] text-slate-400 flex items-center gap-1">
                <Car size={11} /> {e.trajetSuivanteMin} min
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
