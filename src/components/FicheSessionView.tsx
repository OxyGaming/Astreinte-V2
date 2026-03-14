"use client";

import { useState, useCallback, useRef } from "react";
import { Play, Archive, Send, CheckSquare, Square, MessageSquare, Clock, User, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { Fiche, FicheSession, JournalEntry } from "@/lib/types";
import type { SessionUser } from "@/lib/user-auth";

interface Props {
  fiche: Fiche;
  user: SessionUser;
  initialSession: FicheSession | null;
  initialJournal: JournalEntry[];
  initialChecked: Record<string, boolean>; // key: "etape_X_action_Y"
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function FicheSessionView({
  fiche,
  user,
  initialSession,
  initialJournal,
  initialChecked,
}: Props) {
  const [session, setSession] = useState<FicheSession | null>(initialSession);
  const [journal, setJournal] = useState<JournalEntry[]>(initialJournal);
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked);
  const [comment, setComment] = useState("");
  const [starting, setStarting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showJournal, setShowJournal] = useState(true);
  const journalRef = useRef<HTMLDivElement>(null);

  const actionKey = (etapeOrdre: number, actionIndex: number) =>
    `etape_${etapeOrdre}_action_${actionIndex}`;

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ficheSlug: fiche.slug, ficheTitre: fiche.titre }),
      });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } finally {
      setStarting(false);
    }
  };

  const toggleAction = useCallback(
    async (etapeOrdre: number, actionIndex: number, label: string, currentlyChecked: boolean) => {
      if (!session || session.status === "archived") return;
      const key = actionKey(etapeOrdre, actionIndex);
      const newType = currentlyChecked ? "unchecked" : "checked";

      // Optimistic update
      setChecked((prev) => ({ ...prev, [key]: !currentlyChecked }));

      const res = await fetch(`/api/sessions/${session.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapeOrdre, actionIndex, actionLabel: label, type: newType }),
      });

      if (res.ok) {
        // Refresh journal
        const journalRes = await fetch(`/api/sessions/${session.id}`);
        const data = await journalRes.json();
        setJournal(data.journal ?? []);
        // Scroll journal to bottom
        setTimeout(() => {
          journalRef.current?.scrollTo({ top: journalRef.current.scrollHeight, behavior: "smooth" });
        }, 100);
      } else {
        // Rollback
        setChecked((prev) => ({ ...prev, [key]: currentlyChecked }));
      }
    },
    [session]
  );

  const submitComment = async () => {
    if (!session || !comment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: comment.trim() }),
      });
      if (res.ok) {
        setComment("");
        const journalRes = await fetch(`/api/sessions/${session.id}`);
        const data = await journalRes.json();
        setJournal(data.journal ?? []);
        setTimeout(() => {
          journalRef.current?.scrollTo({ top: journalRef.current.scrollHeight, behavior: "smooth" });
        }, 100);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const archiveSession = async () => {
    if (!session) return;
    if (!confirm("Archiver cette session ? Le journal sera figé et une nouvelle session pourra être démarrée.")) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "PUT" });
      const data = await res.json();
      if (data.session) setSession(data.session);
    } finally {
      setArchiving(false);
    }
  };

  const isArchived = session?.status === "archived";
  const isOwner = session?.createdByUserId === user.id;
  const canArchive = !isArchived && (user.role === "ADMIN" || user.role === "EDITOR" || isOwner);

  return (
    <div className="space-y-4">

      {/* ── Session banner ── */}
      {!session ? (
        <div className="mx-4 lg:mx-8 bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-700 text-sm">Mode opérationnel</p>
            <p className="text-xs text-slate-500 mt-0.5">Démarrez une session pour tracer vos actions.</p>
          </div>
          <button
            onClick={startSession}
            disabled={starting}
            className="flex items-center gap-2 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
          >
            <Play size={14} />
            {starting ? "Démarrage…" : "Démarrer"}
          </button>
        </div>
      ) : (
        <div className={`mx-4 lg:mx-8 rounded-xl p-4 border ${isArchived ? "bg-slate-50 border-slate-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isArchived ? "bg-slate-400" : "bg-green-500"}`} />
                <span className="font-semibold text-sm text-slate-800">
                  Session {isArchived ? "archivée" : "active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Démarrée le {formatDateTime(session.startedAt)} par {session.createdByPrenom} {session.createdByNom}
              </p>
              {isArchived && session.endedAt && (
                <p className="text-xs text-slate-500">
                  Clôturée le {formatDateTime(session.endedAt)}
                </p>
              )}
            </div>
            {canArchive && (
              <button
                onClick={archiveSession}
                disabled={archiving}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-400 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0"
              >
                <Archive size={13} />
                {archiving ? "Archivage…" : "Archiver"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Étapes + actions avec checkboxes ── */}
      {session && (
        <div className="px-4 lg:px-8 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Conduite à tenir
          </h2>
          {fiche.etapes.map((etape) => (
            <div
              key={etape.ordre}
              className={`rounded-xl overflow-hidden border ${
                etape.critique ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className={`px-4 py-3 flex items-start gap-3 ${etape.critique ? "border-b border-red-200" : ""}`}>
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    etape.critique ? "bg-red-600 text-white" : "bg-blue-800 text-white"
                  }`}
                >
                  {etape.ordre}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{etape.titre}</h3>
                    {etape.critique && <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{etape.description}</p>
                </div>
              </div>

              {etape.actions && etape.actions.length > 0 && (
                <div className="px-4 py-3 space-y-2">
                  {etape.actions.map((action, i) => {
                    const key = actionKey(etape.ordre, i);
                    const isChecked = !!checked[key];
                    return (
                      <button
                        key={i}
                        onClick={() => toggleAction(etape.ordre, i, action, isChecked)}
                        disabled={isArchived}
                        className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors ${
                          isArchived
                            ? "cursor-default"
                            : "hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                        } ${isChecked ? "opacity-60" : ""}`}
                      >
                        {isChecked ? (
                          <CheckSquare
                            size={18}
                            className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-500" : "text-blue-600"}`}
                          />
                        ) : (
                          <Square
                            size={18}
                            className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-300" : "text-slate-300"}`}
                          />
                        )}
                        <span
                          className={`text-sm leading-snug ${
                            isChecked ? "line-through text-slate-400" : "text-slate-700"
                          }`}
                        >
                          {action}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Journal ── */}
      {session && (
        <div className="px-4 lg:px-8">
          <button
            onClick={() => setShowJournal((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 hover:text-slate-700 transition-colors"
          >
            <MessageSquare size={13} />
            Journal d&apos;événement ({journal.length} entrées)
            {showJournal ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showJournal && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* Timeline */}
              <div
                ref={journalRef}
                className="max-h-80 overflow-y-auto divide-y divide-slate-100"
              >
                {journal.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-4 text-center italic">
                    Aucune entrée — cochez des actions ou ajoutez un commentaire.
                  </p>
                ) : (
                  journal.map((entry) => (
                    <div key={entry.id} className="px-4 py-3 flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {entry.kind === "action" ? (
                          <CheckSquare
                            size={14}
                            className={entry.type === "checked" ? "text-blue-500" : "text-slate-300"}
                          />
                        ) : (
                          <MessageSquare size={14} className="text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {formatTime(entry.timestamp)}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <User size={10} />
                            {entry.userPrenom} {entry.userNom}
                          </span>
                          {entry.kind === "action" && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              entry.type === "checked"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {entry.type === "checked" ? "Coché" : "Décoché"}
                            </span>
                          )}
                          {entry.kind === "comment" && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700">
                              Commentaire
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-0.5 leading-snug">
                          {entry.kind === "action" ? entry.actionLabel : entry.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment input */}
              {!isArchived && (
                <div className="border-t border-slate-200 p-3 bg-slate-50 flex gap-2">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
                    placeholder="Ajouter un commentaire terrain…"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={submitComment}
                    disabled={!comment.trim() || submittingComment}
                    className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Send size={14} />
                    Ajouter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
