import { Info, Phone, Library, ExternalLink, Map, Target } from "lucide-react";
import PhoneButton from "@/components/PhoneButton";
import type { TourneePlan } from "@/lib/tournee/types";
import { itineraireUrls } from "@/lib/tournee/navigation";
import TexteConsigne from "./TexteConsigne";

/** « À propos », contacts, liens, itinéraire complet — avant et pendant la tournée. */
export default function TourneeInfos({ plan }: { plan: TourneePlan }) {
  const points = plan.etapes
    .filter((e) => !e.optionnelle && e.latitude != null && e.longitude != null)
    .map((e) => ({ lat: e.latitude!, lng: e.longitude! }));
  const itineraires = itineraireUrls(points);

  return (
    <div className="space-y-5">
      <section className="card p-4 space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Info size={16} className="text-blue-600" /> À propos de cette tournée</h3>
        {plan.objectif && (
          <p className="text-sm text-slate-700 flex gap-2"><Target size={15} className="text-blue-600 flex-shrink-0 mt-0.5" /> {plan.objectif}</p>
        )}
        {plan.description && <p className="text-sm text-slate-600">{plan.description}</p>}
        {plan.aPropos.map((s) => (
          <div key={s.id}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{s.titre}</p>
            <TexteConsigne texte={s.texte} className="text-slate-700" />
          </div>
        ))}
        {!plan.objectif && !plan.description && plan.aPropos.length === 0 && (
          <p className="text-sm text-slate-400">Pas d&apos;information complémentaire.</p>
        )}
      </section>

      {plan.contacts.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Phone size={12} /> Contacts utiles</h3>
          <div className="card divide-y divide-slate-100">
            {plan.contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{c.fonction}</p>
                  <p className="font-semibold text-sm text-slate-800">{c.nom || "—"}</p>
                </div>
                {c.telephone && <PhoneButton number={c.telephone} size="sm" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {(plan.liens.length > 0 || itineraires.length > 0) && (
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Library size={12} /> Ressources</h3>
          <div className="card divide-y divide-slate-100">
            {itineraires.map((u, i) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                <Map size={16} className="text-blue-600" />
                <span className="flex-1 text-sm font-medium text-slate-800">
                  Itinéraire complet{itineraires.length > 1 ? ` — tronçon ${i + 1}` : ""}
                </span>
                <ExternalLink size={14} className="text-slate-300" />
              </a>
            ))}
            {plan.liens.map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50">
                <Library size={16} className="text-blue-600" />
                <span className="flex-1 text-sm font-medium text-slate-800">{l.libelle}</span>
                <ExternalLink size={14} className="text-slate-300" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
