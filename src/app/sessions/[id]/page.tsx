import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Archive, Play, Clock, User, CheckSquare, MessageSquare } from "lucide-react";
import { requireUserSession, canAccessSession } from "@/lib/user-auth";
import { getSessionById, getSessionJournal } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default async function SessionDetailPage({ params }: Props) {
  const user = await requireUserSession();
  const { id } = await params;

  const session = await getSessionById(id);
  if (!session) notFound();
  if (!canAccessSession(user, session)) notFound();
  const journal = await getSessionJournal(id);

  const isArchived = session.status === "archived";
  const actionCount = journal.filter((e) => e.kind === "action" && e.type === "checked").length;
  const commentCount = journal.filter((e) => e.kind === "comment").length;

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className={`px-4 pt-5 pb-5 lg:px-8 ${isArchived ? "bg-slate-700" : "bg-green-800"} text-white`}>
        <Link
          href="/sessions"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Événements
        </Link>

        <div className="flex items-center gap-2 mb-2">
          {isArchived ? <Archive size={16} className="opacity-70" /> : <Play size={16} className="opacity-70" />}
          <span className="text-xs font-bold opacity-60 uppercase tracking-wide">
            Session {isArchived ? "archivée" : "active"}
          </span>
        </div>
        <h1 className="text-xl font-bold leading-tight">{session.ficheTitre}</h1>

        <div className="mt-3 flex flex-wrap gap-4 text-sm opacity-80">
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            Démarré le {formatDateTime(session.startedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <User size={13} />
            {session.createdByPrenom} {session.createdByNom}
          </span>
        </div>
        {isArchived && session.endedAt && (
          <p className="text-sm opacity-70 mt-1 flex items-center gap-1.5">
            <Archive size={13} />
            Clôturé le {formatDateTime(session.endedAt)}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <CheckSquare size={12} />
            {actionCount} action{actionCount !== 1 ? "s" : ""} cochée{actionCount !== 1 ? "s" : ""}
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
            <MessageSquare size={12} />
            {commentCount} commentaire{commentCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Journal */}
      <div className="px-4 py-5 lg:px-8 space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          Journal chronologique
        </h2>

        {journal.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucune entrée dans le journal.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />

            <div className="space-y-3">
              {journal.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4 relative">
                  {/* Dot */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      entry.kind === "comment"
                        ? "bg-amber-100 border-2 border-amber-300"
                        : entry.type === "checked"
                        ? "bg-blue-100 border-2 border-blue-300"
                        : "bg-slate-100 border-2 border-slate-200"
                    }`}
                  >
                    {entry.kind === "comment" ? (
                      <MessageSquare size={13} className="text-amber-600" />
                    ) : (
                      <CheckSquare size={13} className={entry.type === "checked" ? "text-blue-600" : "text-slate-400"} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 mb-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {formatTime(entry.timestamp)}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {entry.userPrenom} {entry.userNom}
                      </span>
                      {entry.kind === "action" && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          entry.type === "checked"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {entry.type === "checked" ? "Action cochée" : "Action décochée"}
                        </span>
                      )}
                      {entry.kind === "comment" && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Commentaire
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 leading-snug">
                      {entry.kind === "action" ? entry.actionLabel : entry.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link back to fiche */}
        <div className="pt-2">
          <Link
            href={`/fiches/${session.ficheSlug}`}
            className="text-sm text-blue-700 hover:underline font-medium"
          >
            → Ouvrir la fiche &quot;{session.ficheTitre}&quot;
          </Link>
        </div>
      </div>
    </div>
  );
}
