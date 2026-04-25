export const dynamic = "force-dynamic";

import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  User,
  Building2,
} from "lucide-react";
import type { ProcedureMetier } from "@/lib/procedure/types";

// ─── Constantes d'affichage ───────────────────────────────────────────────────

const STATUT_CONFIG: Record<string, { label: string; icon: React.ReactNode; classes: string }> = {
  en_cours:   {
    label:   "En cours",
    icon:    <Clock size={12} />,
    classes: "bg-blue-100 text-blue-700",
  },
  terminee:   {
    label:   "Terminée",
    icon:    <CheckCircle2 size={12} />,
    classes: "bg-emerald-100 text-emerald-700",
  },
  abandonnee: {
    label:   "Abandonnée",
    icon:    <XCircle size={12} />,
    classes: "bg-red-100 text-red-700",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseProcedureTitre(snapshot: string): string {
  try {
    const parsed = JSON.parse(snapshot) as Partial<ProcedureMetier>;
    return parsed.titre ?? "—";
  } catch {
    return "—";
  }
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminSessionsPage() {
  await requireAdminSession();

  // 100 sessions les plus récentes — suffisant pour V1
  const sessions = await prisma.sessionProcedure.findMany({
    orderBy: { startedAt: "desc" },
    take:    100,
    select: {
      id:                true,
      procedureSnapshot: true,
      posteSlug:         true,
      agentNom:          true,
      statut:            true,
      startedAt:         true,
      completedAt:       true,
      eventsArchived:    true,
    },
  });

  // Compteurs
  const total      = sessions.length;
  const enCours    = sessions.filter(s => s.statut === "en_cours").length;
  const terminees  = sessions.filter(s => s.statut === "terminee").length;
  const abandonnees = sessions.filter(s => s.statut === "abandonnee").length;
  const archivees  = sessions.filter(s => s.eventsArchived).length;

  return (
    <div className="p-8">

      {/* ── En-tête ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <Link href="/admin/procedures" className="hover:text-gray-600 transition-colors">
            Procédures guidées
          </Link>
          <span>/</span>
          <span className="text-gray-600">Sessions</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Sessions procédures</h1>
        <p className="text-gray-500 text-sm mt-1">
          {total} session{total !== 1 ? "s" : ""} (100 plus récentes)
        </p>
      </div>

      {/* ── Compteurs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">En cours</p>
          <p className="text-2xl font-bold text-blue-600">{enCours}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Terminées</p>
          <p className="text-2xl font-bold text-emerald-600">{terminees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Abandonnées</p>
          <p className="text-2xl font-bold text-red-500">{abandonnees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Archivées</p>
          <p className="text-2xl font-bold text-gray-500">{archivees}</p>
        </div>
      </div>

      {/* ── Table ── */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune session enregistrée.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table style={{ minWidth: 960 }} className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Procédure</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Poste</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Démarrée</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Clôturée</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Événements</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(session => {
                const statutMeta = STATUT_CONFIG[session.statut] ?? {
                  label:   session.statut,
                  icon:    null,
                  classes: "bg-gray-100 text-gray-700",
                };
                const procedureTitre = parseProcedureTitre(session.procedureSnapshot);

                return (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">

                    {/* Procédure */}
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-48">
                        {procedureTitre}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                        {session.id}
                      </p>
                    </td>

                    {/* Poste */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        <Building2 size={11} />
                        {session.posteSlug}
                      </span>
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-4">
                      {session.agentNom ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                          <User size={12} className="text-gray-400" />
                          {session.agentNom}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statutMeta.classes}`}>
                        {statutMeta.icon}
                        {statutMeta.label}
                      </span>
                    </td>

                    {/* Démarrée */}
                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(session.startedAt)}
                    </td>

                    {/* Clôturée */}
                    <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {session.statut === "en_cours"
                        ? <span className="text-blue-500 italic">En cours…</span>
                        : formatDate(session.completedAt)
                      }
                    </td>

                    {/* Événements archivés */}
                    <td className="px-4 py-4">
                      {session.eventsArchived ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <Archive size={12} />
                          Archivés
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Actifs</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/procedures/sessions/${session.id}/history`}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Voir l'historique"
                      >
                        <History size={13} />
                        Historique
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
