import type { Synthese } from "@/lib/procedure/types";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  synthese: Synthese;
  procedureTitre: string;
  posteSlug: string;
  agentNom?: string;
  completedAt?: string;
}

const STATUT_CONFIG = {
  possible: {
    bg: "bg-green-50 border-green-300",
    icon: <CheckCircle2 size={28} className="text-green-600" />,
    titre: "Cessation autorisée",
    textColor: "text-green-800",
  },
  possible_avec_alerte: {
    bg: "bg-amber-50 border-amber-300",
    icon: <AlertTriangle size={28} className="text-amber-600" />,
    titre: "Cessation possible — points d'alerte",
    textColor: "text-amber-800",
  },
  impossible: {
    bg: "bg-red-50 border-red-300",
    icon: <XCircle size={28} className="text-red-600" />,
    titre: "Cessation impossible",
    textColor: "text-red-800",
  },
  incomplet: {
    bg: "bg-slate-50 border-slate-300",
    icon: <Clock size={28} className="text-slate-500" />,
    titre: "Procédure incomplète",
    textColor: "text-slate-700",
  },
};

export default function ProcedureSummary({
  synthese, procedureTitre, posteSlug, agentNom, completedAt,
}: Props) {
  const config = STATUT_CONFIG[synthese.statut];

  return (
    <div className="space-y-5">
      {/* Bandeau statut */}
      <div className={`rounded-2xl border-2 p-5 ${config.bg}`}>
        <div className="flex items-center gap-3 mb-2">
          {config.icon}
          <h2 className={`text-lg font-bold ${config.textColor}`}>{config.titre}</h2>
        </div>
        <p className={`text-sm ${config.textColor}`}>{synthese.message}</p>
        {completedAt && (
          <p className="text-xs text-slate-500 mt-2">
            Validée le {new Date(completedAt).toLocaleString("fr-FR")}
            {agentNom ? ` par ${agentNom}` : ""}
          </p>
        )}
      </div>

      {/* Points bloquants */}
      {synthese.blocages.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
            <XCircle size={15} />
            Points bloquants ({synthese.blocages.length})
          </h3>
          <div className="space-y-2">
            {synthese.blocages.map((b) => (
              <div key={`${b.etapeId}-${b.actionId}`} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-0.5">
                  {b.etapeTitre}
                </p>
                <p className="text-sm text-red-900 font-medium">{b.actionLabel}</p>
                <p className="text-xs text-red-600 mt-1">
                  Répondu : <strong>{String(b.reponse)}</strong> — attendu :{" "}
                  <strong>{String(b.reponseAttendue)}</strong>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Points d'alerte */}
      {synthese.alertes.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={15} />
            Points d&apos;alerte ({synthese.alertes.length})
          </h3>
          <div className="space-y-2">
            {synthese.alertes.map((a) => (
              <div key={`${a.etapeId}-${a.actionId}`} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">
                  {a.etapeTitre}
                </p>
                <p className="text-sm text-amber-900 font-medium">{a.actionLabel}</p>
                {a.note && <p className="text-xs text-amber-600 mt-1">{a.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Retour */}
      <Link
        href={`/postes/${posteSlug}`}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft size={16} />
        Retour au poste
      </Link>
    </div>
  );
}
