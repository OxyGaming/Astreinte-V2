export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/admin-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  User,
  Building2,
  AlertTriangle,
  Ban,
  CheckCheck,
  HelpCircle,
} from "lucide-react";
import { getSessionWithEvents } from "@/lib/repositories/sessionEventRepository";
import type { ProcedureMetier, Synthese } from "@/lib/procedure/types";

// ─── Types locaux ─────────────────────────────────────────────────────────────

type Params = { params: Promise<{ id: string }> };

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const STATUT_SESSION: Record<string, { label: string; icon: React.ReactNode; classes: string }> = {
  en_cours:   { label: "En cours",    icon: <Clock size={13} />,         classes: "bg-blue-100 text-blue-700" },
  terminee:   { label: "Terminée",    icon: <CheckCircle2 size={13} />,  classes: "bg-emerald-100 text-emerald-700" },
  abandonnee: { label: "Abandonnée",  icon: <XCircle size={13} />,       classes: "bg-red-100 text-red-700" },
};

const STATUT_SYNTHESE: Record<string, { label: string; icon: React.ReactNode; classes: string }> = {
  possible:             { label: "Possible",              icon: <CheckCheck size={13} />,    classes: "bg-emerald-100 text-emerald-700" },
  possible_avec_alerte: { label: "Possible avec alerte",  icon: <AlertTriangle size={13} />, classes: "bg-amber-100 text-amber-700" },
  impossible:           { label: "Impossible",            icon: <Ban size={13} />,            classes: "bg-red-100 text-red-700" },
  incomplet:            { label: "Incomplet",             icon: <HelpCircle size={13} />,     classes: "bg-gray-100 text-gray-600" },
};

const EVENT_TYPE: Record<string, { label: string; dot: string }> = {
  session_started:     { label: "Session démarrée",    dot: "bg-blue-400" },
  reponse_enregistree: { label: "Réponse enregistrée", dot: "bg-green-400" },
  etape_avancee:       { label: "Étape avancée",       dot: "bg-indigo-400" },
  session_completee:   { label: "Session complétée",   dot: "bg-emerald-500" },
  session_abandonnee:  { label: "Session abandonnée",  dot: "bg-red-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day:    "2-digit",
    month:  "long",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

function formatValeur(valeur: string | null): { text: string; classes: string } | null {
  if (valeur === null) return null;
  if (valeur === "true")  return { text: "Oui",  classes: "text-emerald-700 bg-emerald-50 border border-emerald-200" };
  if (valeur === "false") return { text: "Non",  classes: "text-red-700 bg-red-50 border border-red-200" };
  return { text: valeur, classes: "text-gray-700 bg-gray-50 border border-gray-200" };
}

function safeParseSynthese(raw: string | null): Synthese | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Synthese; } catch { return null; }
}

function safeParseTitre(snapshot: string): string {
  try {
    const p = JSON.parse(snapshot) as Partial<ProcedureMetier>;
    return p.titre ?? "—";
  } catch { return "—"; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SessionHistoryPage({ params }: Params) {
  await requireAdminSession();

  const { id } = await params;
  const data = await getSessionWithEvents(id);
  if (!data) notFound();

  const { session, events } = data;

  const procedureTitre = safeParseTitre(session.procedureSnapshot);
  const synthese       = safeParseSynthese(session.synthese);
  const statutMeta     = STATUT_SESSION[session.statut] ?? {
    label: session.statut, icon: null, classes: "bg-gray-100 text-gray-700",
  };

  const totalEvents   = events.length;
  const activeCount   = events.filter(e => !e.fromArchive).length;
  const archivedCount = events.filter(e => e.fromArchive).length;

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Fil d'Ariane ── */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/admin/procedures" className="hover:text-gray-600 transition-colors">
          Procédures
        </Link>
        <ChevronRight size={14} />
        <Link href="/admin/procedures/sessions" className="hover:text-gray-600 transition-colors">
          Sessions
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-600 font-mono">{id.slice(0, 12)}…</span>
      </nav>

      {/* ── En-tête session ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{procedureTitre}</h1>
            <p className="text-xs text-gray-400 font-mono mt-1">{session.id}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${statutMeta.classes}`}>
            {statutMeta.icon}
            {statutMeta.label}
          </span>
        </div>

        {/* Méta */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-1">Poste</p>
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Building2 size={13} className="text-gray-400" />
              {session.posteSlug}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Agent</p>
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <User size={13} className="text-gray-400" />
              {session.agentNom ?? <span className="italic text-gray-400">Non renseigné</span>}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Démarrée le</p>
            <span className="text-gray-700">{formatDateLong(session.startedAt)}</span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Clôturée le</p>
            <span className="text-gray-700">
              {session.statut === "en_cours"
                ? <span className="italic text-blue-500">En cours…</span>
                : formatDateLong(session.completedAt)
              }
            </span>
          </div>
        </div>

        {/* Synthèse */}
        {synthese && (() => {
          const sm = STATUT_SYNTHESE[synthese.statut] ?? {
            label: synthese.statut, icon: null, classes: "bg-gray-100 text-gray-600",
          };
          return (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Synthèse</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${sm.classes}`}>
                  {sm.icon}
                  {sm.label}
                </span>
                <span className="text-sm text-gray-600">{synthese.message}</span>
              </div>
              {synthese.blocages.length > 0 && (
                <div className="mt-3 space-y-1">
                  {synthese.blocages.map((b, i) => (
                    <p key={i} className="text-xs text-red-600">
                      ✕ {b.etapeTitre} — {b.actionLabel}
                      {b.reponse !== null && (
                        <span className="ml-1 text-red-400">(répondu : {String(b.reponse)})</span>
                      )}
                    </p>
                  ))}
                </div>
              )}
              {synthese.alertes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {synthese.alertes.map((a, i) => (
                    <p key={i} className="text-xs text-amber-600">
                      ⚠ {a.etapeTitre} — {a.actionLabel}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Compteur événements ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Journal des événements
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({totalEvents} événement{totalEvents !== 1 ? "s" : ""})
          </span>
        </h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {activeCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {activeCount} actif{activeCount !== 1 ? "s" : ""}
            </span>
          )}
          {archivedCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              {archivedCount} archivé{archivedCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-sm">Aucun événement enregistré pour cette session.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Ligne verticale de la timeline */}
          <div className="absolute left-[23px] top-3 bottom-3 w-px bg-gray-200" aria-hidden />

          <ol className="space-y-3">
            {events.map((event, index) => {
              const typeMeta  = EVENT_TYPE[event.type] ?? { label: event.type, dot: "bg-gray-400" };
              const valeurFmt = formatValeur(event.valeur);
              const isLast    = index === events.length - 1;

              return (
                <li key={event.id} className="relative flex gap-4">
                  {/* Point de timeline */}
                  <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 48 }}>
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm mt-3.5 z-10 ${typeMeta.dot}`} />
                    {!isLast && <div className="flex-1" />}
                  </div>

                  {/* Carte événement */}
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-0.5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Numéro de séquence */}
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          #{event.sequence}
                        </span>

                        {/* Type */}
                        <span className="text-sm font-medium text-gray-800">
                          {typeMeta.label}
                        </span>

                        {/* Badge archive */}
                        {event.fromArchive && (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                            <Archive size={10} />
                            Archivé
                          </span>
                        )}
                      </div>

                      {/* Horodatage */}
                      <time
                        dateTime={event.occurredAt.toISOString()}
                        className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0"
                      >
                        {formatDateLong(event.occurredAt)}
                      </time>
                    </div>

                    {/* Détails */}
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                      {event.etapeId && (
                        <span>
                          <span className="text-gray-400">Étape :</span>{" "}
                          <span className="font-mono">{event.etapeId}</span>
                        </span>
                      )}
                      {event.actionId && (
                        <span>
                          <span className="text-gray-400">Action :</span>{" "}
                          <span className="font-mono">{event.actionId}</span>
                        </span>
                      )}
                      {valeurFmt && (
                        <span>
                          <span className="text-gray-400">Valeur :</span>{" "}
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${valeurFmt.classes}`}>
                            {valeurFmt.text}
                          </span>
                        </span>
                      )}
                      {event.actorNom && (
                        <span>
                          <span className="text-gray-400">Agent :</span>{" "}
                          {event.actorNom}
                        </span>
                      )}
                    </div>

                    {/* Date d'archivage si applicable */}
                    {event.fromArchive && event.archivedAt && (
                      <p className="mt-2 text-xs text-gray-400">
                        Archivé le {formatDateLong(event.archivedAt)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
