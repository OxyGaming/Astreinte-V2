export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, AlertTriangle, ChevronRight, Phone, BookOpen } from "lucide-react";
import { getSecteurBySlug } from "@/lib/db";
import Accordion from "@/components/Accordion";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SecteurDetailPage({ params }: Props) {
  const { slug } = await params;
  const secteur = await getSecteurBySlug(slug);
  if (!secteur) notFound();

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-amber-700 text-white px-4 pt-5 pb-5 lg:px-8">
        <Link
          href="/secteurs"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Secteurs
        </Link>
        <div className="flex items-center gap-2 text-xs font-bold opacity-60 mb-1">
          <span>LIGNE {secteur.ligne}</span>
        </div>
        <h1 className="text-xl font-bold">{secteur.nom}</h1>
        <p className="text-sm opacity-80 mt-1">{secteur.trajet}</p>
        <p className="text-sm opacity-70 mt-2 leading-relaxed">{secteur.description}</p>
      </div>

      <div className="px-4 py-5 space-y-5 lg:px-8">

        {/* Points d'accès */}
        {secteur.points_acces.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Points d'accès
            </h2>
            <div className="space-y-2">
              {secteur.points_acces.map((pa, i) => (
                <div key={i} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-amber-100 rounded-lg flex-shrink-0 mt-0.5">
                      <MapPin size={14} className="text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{pa.nom}</p>
                      {pa.adresse && (
                        <p className="text-xs text-slate-500 mt-0.5">{pa.adresse}</p>
                      )}
                      {pa.code && (
                        <div className="inline-flex items-center gap-1.5 mt-2 bg-slate-900 text-white text-sm font-mono font-bold px-3 py-1.5 rounded-lg">
                          <span className="text-slate-400 text-xs">CODE</span>
                          {pa.code}
                        </div>
                      )}
                      {pa.note && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 rounded-lg p-2 border border-slate-200">
                          {pa.note}
                        </p>
                      )}
                      {pa.gps && (
                        <a
                          href={`https://maps.google.com/?q=${pa.gps.replace(/\s/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-700 font-medium hover:underline"
                        >
                          <Navigation size={12} />
                          {pa.gps}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PN */}
        {secteur.pn && secteur.pn.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Passages à Niveau — Vigilances
            </h2>
            <div className="space-y-2">
              {secteur.pn.map((pn, i) => (
                <div key={i} className="card p-4 border-l-4 border-amber-400">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{pn.numero}</p>
                      {pn.axe && (
                        <p className="text-xs text-slate-500 mt-0.5">{pn.axe}</p>
                      )}
                      {pn.note && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{pn.note}</p>
                      )}
                    </div>
                    <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                  </div>
                  {pn.contact_urgence && (
                    <div className="mt-3 flex items-center gap-2">
                      <Phone size={13} className="text-slate-400" />
                      <span className="text-sm font-semibold text-blue-800">
                        {pn.contact_urgence}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Procédures */}
        {secteur.procedures.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Procédures locales
            </h2>
            <div className="space-y-2">
              {secteur.procedures.map((proc, i) => (
                <Accordion
                  key={i}
                  title={proc.titre}
                  badge={proc.critique ? "CRITIQUE" : proc.reference}
                  badgeColor={proc.critique ? "red" : "blue"}
                >
                  <div className="px-4 py-4 bg-white">
                    <p className="text-sm text-slate-700 leading-relaxed mb-3">
                      {proc.description}
                    </p>
                    {proc.etapes && proc.etapes.length > 0 && (
                      <ol className="space-y-2">
                        {proc.etapes.map((etape, j) => (
                          <li key={j} className="flex items-start gap-2.5">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                              {j + 1}
                            </span>
                            <span className="text-sm text-slate-700 leading-snug">{etape}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {proc.reference && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 text-xs text-slate-400">
                          <BookOpen size={12} />
                          <span className="font-mono">{proc.reference}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </Accordion>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
