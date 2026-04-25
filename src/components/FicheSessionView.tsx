"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Archive, Send, CheckSquare, Square, MessageSquare, Clock, User, ChevronDown, ChevronUp, AlertTriangle, Mic, Square as StopIcon, WifiOff, CheckCircle, CloudUpload } from "lucide-react";
import type { Fiche, FicheSession, JournalEntry } from "@/lib/types";
import type { SessionUser } from "@/lib/user-auth";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import MicPermissionModal from "@/components/MicPermissionModal";
import MicDiagnostic from "@/components/MicDiagnostic";
import { enqueue, getBySession, remove as removeOp, update as updateOp, remapSessionId, type PendingOp } from "@/lib/idb-offline";

// localStorage : sessions locales par fiche en attente de promotion serveur
const localSessionKey = (slug: string) => `astreinte:localSession:${slug}`;

function readLocalSession(slug: string): FicheSession | null {
  try {
    const raw = localStorage.getItem(localSessionKey(slug));
    return raw ? (JSON.parse(raw) as FicheSession) : null;
  } catch { return null; }
}

function writeLocalSession(slug: string, session: FicheSession) {
  try { localStorage.setItem(localSessionKey(slug), JSON.stringify(session)); } catch {}
}

function clearLocalSession(slug: string) {
  try { localStorage.removeItem(localSessionKey(slug)); } catch {}
}

function isLocalSessionId(id: string): boolean {
  return id.startsWith("local-");
}

// Verrou module-scope partagé par toutes les instances du composant.
// Indispensable car un useRef() est recréé à chaque remount (React Strict Mode,
// HMR/Fast Refresh, ou simple changement de session local→serveur). Sans ce
// verrou partagé, deux instances du composant peuvent draîner la même file en
// parallèle et POSTer chaque op deux fois.
const moduleDrainLocks = new Set<string>();

// Erreurs remontées par SpeechRecognition après que le micro est accordé
const SPEECH_ERRORS: Record<string, string> = {
  "not-supported": "La dictée vocale n'est pas disponible sur ce navigateur.",
  "no-speech": "Aucune voix détectée. Réessayez.",
  "audio-capture": "Impossible d'accéder au microphone.",
  "network": "Erreur réseau lors de la dictée.",
  "unknown": "Erreur lors de la dictée vocale.",
};

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
  // Clés des actions en cours de fetch — empêche les doubles clics d'envoyer plusieurs requêtes
  const pendingKeys = useRef<Set<string>>(new Set());
  // File d'attente offline persistée (IndexedDB) — synchronisée par refreshPending
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [draining, setDraining] = useState(false);

  // Détection offline — initialisé à false (identique au rendu SSR) pour éviter
  // l'erreur d'hydration. La vraie valeur est lue dans useEffect, après le montage.
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    // Synchroniser avec l'état réseau réel dès le montage côté client
    setIsOffline(!navigator.onLine);
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Recovery d'une session locale (créée hors ligne) après reload.
  // Si le serveur a déjà une session active pour cette fiche, on purge tout
  // résidu local pour éviter qu'il ne ré-apparaisse à un reload ultérieur.
  useEffect(() => {
    if (initialSession) {
      clearLocalSession(fiche.slug);
      return;
    }
    const local = readLocalSession(fiche.slug);
    if (local) setSession(local);
  }, [fiche.slug, initialSession]);

  // Recharge la file d'attente IDB pour la session courante.
  const refreshPending = useCallback(async () => {
    if (!session) return;
    try {
      const ops = await getBySession(session.id);
      setPendingOps(ops);
    } catch {
      // IDB indisponible (SSR, navigateur ancien, mode privé) — silencieux
    }
  }, [session]);

  // Tente de rejouer la file d'attente vers l'API.
  // - 2xx : on retire l'op de la file
  // - 4xx : op invalide (session archivée, payload rejeté…) → on retire pour ne pas bloquer
  // - 5xx ou exception réseau : on incrémente attempts et on s'arrête (retentera au prochain online)
  //
  // Cas spécial `session-create` : si la session est encore locale (id "local-…"),
  // on la promeut auprès du serveur EN PREMIER, on remappe les ops dépendantes
  // vers le vrai id, puis on continue le drain habituel.
  const drainQueue = useCallback(async () => {
    if (!session) return;
    // Verrou module-scope, atomique avant tout await. Le verrou est posé sur
    // l'id de session courant : si la session est promue, on transfère la
    // garde sur le nouvel id avant de relâcher l'ancien.
    const initialLockKey = session.id;
    if (moduleDrainLocks.has(initialLockKey)) return;
    moduleDrainLocks.add(initialLockKey);
    setDraining(true);

    let currentSessionId = session.id;
    let lastJournal: JournalEntry[] | null = null;

    try {
      let ops: PendingOp[];
      try {
        ops = await getBySession(session.id);
      } catch {
        return;
      }
      if (ops.length === 0) return;

      // 1) Promotion de la session locale (si présente)
      const createOp = ops.find((o) => o.kind === "session-create");
      if (createOp && createOp.id !== undefined) {
        try {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ficheSlug: createOp.ficheSlug,
              ficheTitre: createOp.payload.ficheTitre,
              clientOpId: createOp.clientOpId,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const realSession = data.session as FicheSession;
            await remapSessionId(currentSessionId, realSession.id);
            clearLocalSession(fiche.slug);
            await removeOp(createOp.id);
            // Transférer le verrou sur le nouvel id pour éviter qu'un drain
            // déclenché par le setSession (re-render) ne s'autorise à courir.
            moduleDrainLocks.add(realSession.id);
            currentSessionId = realSession.id;
            setSession(realSession);
            try {
              ops = await getBySession(realSession.id);
            } catch {
              ops = [];
            }
          } else if (res.status >= 400 && res.status < 500) {
            // Le serveur refuse la création : on abandonne la session locale et ses dépendances
            await removeOp(createOp.id);
            clearLocalSession(fiche.slug);
            ops = [];
          } else {
            await updateOp({ ...createOp, attempts: createOp.attempts + 1, lastError: `HTTP ${res.status}` });
            return;
          }
        } catch (err) {
          await updateOp({ ...createOp, attempts: createOp.attempts + 1, lastError: String(err) });
          return;
        }
      }

      // 2) Drain des ops dépendantes (action, comment) avec l'id courant
      for (const op of ops) {
        if (op.id === undefined) continue;
        if (op.kind === "session-create") continue; // déjà traité ci-dessus
        try {
          const url = op.kind === "action"
            ? `/api/sessions/${currentSessionId}/actions`
            : `/api/sessions/${currentSessionId}/comments`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...op.payload, clientOpId: op.clientOpId }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.journal) lastJournal = data.journal;
            await removeOp(op.id);
          } else if (res.status >= 400 && res.status < 500) {
            await removeOp(op.id);
          } else {
            await updateOp({ ...op, attempts: op.attempts + 1, lastError: `HTTP ${res.status}` });
            break;
          }
        } catch (err) {
          await updateOp({ ...op, attempts: op.attempts + 1, lastError: String(err) });
          break;
        }
      }

      if (lastJournal) setJournal(lastJournal);
    } finally {
      try {
        const remaining = await getBySession(currentSessionId);
        setPendingOps(remaining);
      } catch {}
      setDraining(false);
      moduleDrainLocks.delete(initialLockKey);
      moduleDrainLocks.delete(currentSessionId);
    }
  }, [session, fiche.slug]);

  // Au montage / changement de session : recharge la file et réapplique les ops "checked"
  // sur la map locale pour persister l'état UI après un refresh hors ligne.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const ops = await getBySession(session.id);
        if (cancelled) return;
        setPendingOps(ops);
        if (ops.length > 0) {
          setChecked((prev) => {
            const next = { ...prev };
            for (const op of ops) {
              if (op.kind === "action") {
                const k = `etape_${op.payload.etapeOrdre}_action_${op.payload.actionIndex}`;
                next[k] = op.payload.type === "checked";
              }
            }
            return next;
          });
        }
      } catch {}
      if (!cancelled && navigator.onLine) {
        drainQueue();
      }
    })();
    return () => { cancelled = true; };
  }, [session, drainQueue]);

  // Drain dès qu'on repasse online
  useEffect(() => {
    if (!session) return;
    const onOnline = () => { drainQueue(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [session, drainQueue]);

  const speech = useSpeechRecognition((text) => setComment(text));
  const [showMicModal, setShowMicModal] = useState(false);

  /**
   * Lance la dictée directement via SpeechRecognition.
   * L'API gère sa propre permission nativement (popup navigateur si besoin).
   * Réinitialise toujours l'état d'erreur à chaque clic — jamais d'état "refusé" persistant.
   */
  const handleMicClick = () => {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    // Reset systématique : permet de réessayer après avoir accordé la permission
    speech.clearError();
    speech.start(comment);
  };

  const actionKey = (etapeOrdre: number, actionIndex: number) =>
    `etape_${etapeOrdre}_action_${actionIndex}`;

  const startSession = async () => {
    setStarting(true);
    try {
      // Mode online : POST direct vers le serveur
      if (!isOffline) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ficheSlug: fiche.slug,
            ficheTitre: fiche.titre,
            clientOpId: crypto.randomUUID(),
          }),
        });
        const data = await res.json();
        if (data.session) setSession(data.session);
        return;
      }

      // Mode offline : session locale + op `session-create` enfilée pour drain ultérieur.
      // L'id "local-…" sera remappé au vrai id serveur après promotion (cf. drainQueue).
      const localId = `local-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const localSession: FicheSession = {
        id: localId,
        ficheSlug: fiche.slug,
        ficheTitre: fiche.titre,
        createdByUserId: user.id,
        createdByNom: user.nom,
        createdByPrenom: user.prenom,
        startedAt: now,
        endedAt: null,
        status: "active",
      };

      try {
        await enqueue({
          kind: "session-create",
          sessionId: localId,
          ficheSlug: fiche.slug,
          payload: { ficheTitre: fiche.titre },
          userId: user.id,
          userNom: user.nom,
          userPrenom: user.prenom,
          createdAt: Date.now(),
          attempts: 0,
        });
        writeLocalSession(fiche.slug, localSession);
        setSession(localSession);
      } catch {
        // IDB indisponible : on ne peut pas garantir la promotion, donc on n'active pas la session
      }
    } finally {
      setStarting(false);
    }
  };

  const toggleAction = useCallback(
    async (etapeOrdre: number, actionIndex: number, label: string, currentlyChecked: boolean) => {
      if (!session || session.status === "archived") return;
      const key = actionKey(etapeOrdre, actionIndex);
      if (pendingKeys.current.has(key)) return; // dédup : ignore si déjà en cours
      pendingKeys.current.add(key);

      // Optimistic update — quel que soit le mode (online/offline)
      setChecked((prev) => ({ ...prev, [key]: !currentlyChecked }));

      const payload = {
        etapeOrdre,
        actionIndex,
        actionLabel: label,
        type: (currentlyChecked ? "unchecked" : "checked") as "checked" | "unchecked",
      };

      try {
        if (isOffline) {
          // Pas de réseau → on enfile l'op dans IDB pour rejeu ultérieur
          try {
            await enqueue({
              kind: "action",
              sessionId: session.id,
              ficheSlug: fiche.slug,
              payload,
              userId: user.id,
              userNom: user.nom,
              userPrenom: user.prenom,
              createdAt: Date.now(),
              attempts: 0,
            });
            await refreshPending();
          } catch {
            // IDB indisponible → revert pour refléter l'échec
            setChecked((prev) => ({ ...prev, [key]: currentlyChecked }));
          }
          return;
        }

        const res = await fetch(`/api/sessions/${session.id}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, clientOpId: crypto.randomUUID() }),
        });

        if (res.ok) {
          const data = await res.json();
          setJournal(data.journal ?? []);
          setTimeout(() => {
            journalRef.current?.scrollTo({ top: journalRef.current.scrollHeight, behavior: "smooth" });
          }, 100);
        } else {
          setChecked((prev) => ({ ...prev, [key]: currentlyChecked }));
        }
      } finally {
        pendingKeys.current.delete(key);
      }
    },
    [session, isOffline, fiche.slug, user, refreshPending]
  );

  const submitComment = async () => {
    if (!session || !comment.trim()) return;
    const message = comment.trim();
    setSubmittingComment(true);
    try {
      if (isOffline) {
        try {
          await enqueue({
            kind: "comment",
            sessionId: session.id,
            ficheSlug: fiche.slug,
            payload: { message },
            userId: user.id,
            userNom: user.nom,
            userPrenom: user.prenom,
            createdAt: Date.now(),
            attempts: 0,
          });
          setComment("");
          await refreshPending();
        } catch {
          // IDB indisponible — on garde le texte pour permettre une nouvelle tentative
        }
        return;
      }

      const res = await fetch(`/api/sessions/${session.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, clientOpId: crypto.randomUUID() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComment("");
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
  const isLocalSession = !!session && isLocalSessionId(session.id);
  // L'archivage tape /api/sessions/<id> : impossible tant que l'id n'est pas le vrai id serveur.
  const canArchive = !isArchived && !isLocalSession && (user.role === "ADMIN" || user.role === "EDITOR" || isOwner);

  /**
   * Mode interactif = session active + non archivée.
   * Hors ligne, les actions sont enfilées dans IndexedDB et rejouées au retour du réseau.
   */
  const isInteractive = !!session && !isArchived;

  // Vue agrégée pour le journal : entrées serveur + ops en attente (rendu visuel "pending").
  // Les ops `session-create` ne sont pas représentables comme entrée de journal — on les filtre.
  const pendingEntries: JournalEntry[] = pendingOps
    .filter((op): op is Extract<PendingOp, { kind: "action" | "comment" }> =>
      op.kind === "action" || op.kind === "comment"
    )
    .map((op) =>
      op.kind === "action"
        ? {
            kind: "action",
            id: `pending-${op.id}`,
            timestamp: new Date(op.createdAt).toISOString(),
            userId: op.userId,
            userNom: op.userNom,
            userPrenom: op.userPrenom,
            etapeOrdre: op.payload.etapeOrdre,
            actionIndex: op.payload.actionIndex,
            actionLabel: op.payload.actionLabel,
            type: op.payload.type,
            pending: true,
          }
        : {
            kind: "comment",
            id: `pending-${op.id}`,
            timestamp: new Date(op.createdAt).toISOString(),
            userId: op.userId,
            userNom: op.userNom,
            userPrenom: op.userPrenom,
            message: op.payload.message,
            pending: true,
          }
    );
  const allEntries: JournalEntry[] = [...journal, ...pendingEntries];

  return (
    <div className="space-y-4">

      {/* Modal permission microphone */}
      {showMicModal && (
        <MicPermissionModal onClose={() => setShowMicModal(false)} />
      )}

      {/* ── Session banner ── */}
      {!session ? (
        isOffline ? (
          /* Hors ligne sans session : créer une session locale, promue au retour réseau */
          <div className="mx-4 lg:mx-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <WifiOff size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-amber-800 text-sm">Mode hors ligne</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Une session locale sera créée et synchronisée automatiquement au retour du réseau.
                </p>
              </div>
            </div>
            <button
              onClick={startSession}
              disabled={starting}
              className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 disabled:bg-amber-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
            >
              <Play size={14} />
              {starting ? "Démarrage…" : "Démarrer"}
            </button>
          </div>
        ) : (
          /* En ligne sans session : proposer de démarrer */
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
        )
      ) : (
        <div className={`mx-4 lg:mx-8 rounded-xl p-4 border ${isArchived ? "bg-slate-50 border-slate-200" : "bg-green-50 border-green-200"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isArchived ? "bg-slate-400" : "bg-green-500"}`} />
                <span className="font-semibold text-sm text-slate-800">
                  Session {isArchived ? "archivée" : "active"}
                </span>
                {isLocalSession && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    <CloudUpload size={10} />
                    Locale — à synchroniser
                  </span>
                )}
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

      {/* ── Étapes + actions ── */}
      {/* Toujours affiché : interactif si session active en ligne, lecture seule sinon */}
      <div className="px-4 lg:px-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Conduite à tenir
          </h2>
          {/* Indicateurs de statut réseau / file d'attente */}
          {session && !isArchived && (
            <div className="flex items-center gap-2">
              {isOffline && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <WifiOff size={11} />
                  Hors ligne
                </span>
              )}
              {pendingOps.length > 0 && (
                <span className={`flex items-center gap-1 text-xs font-medium ${draining ? "text-blue-600" : "text-amber-600"}`}>
                  <CloudUpload size={11} className={draining ? "animate-pulse" : ""} />
                  {pendingOps.length} en attente{draining ? " (envoi…)" : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {fiche.etapes.map((etape) => (
          <div
            key={etape.ordre}
            className={`rounded-xl overflow-hidden border ${
              etape.critique ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
            }`}
          >
            {/* En-tête de l'étape */}
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

            {/* Actions */}
            {etape.actions && etape.actions.length > 0 && (
              isInteractive ? (
                /* Mode interactif : checkboxes cliquables */
                <div className="px-4 py-3 space-y-2">
                  {etape.actions.map((action, i) => {
                    const key = actionKey(etape.ordre, i);
                    const isChecked = !!checked[key];
                    return (
                      <button
                        key={i}
                        onClick={() => toggleAction(etape.ordre, i, action, isChecked)}
                        className={`w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors hover:bg-slate-50 active:bg-slate-100 cursor-pointer ${isChecked ? "opacity-60" : ""}`}
                      >
                        {isChecked ? (
                          <CheckSquare size={18} className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-500" : "text-blue-600"}`} />
                        ) : (
                          <Square size={18} className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-300" : "text-slate-300"}`} />
                        )}
                        <span className={`text-sm leading-snug ${isChecked ? "line-through text-slate-400" : "text-slate-700"}`}>
                          {action}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Mode lecture seule : session archivée, hors ligne, ou pas de session */
                <div className="px-4 py-3">
                  <ul className="space-y-1.5">
                    {etape.actions.map((action, i) => {
                      const key = actionKey(etape.ordre, i);
                      const isChecked = !!checked[key];
                      return (
                        <li key={i} className="flex items-start gap-2">
                          {session ? (
                            /* Session existante (archivée ou hors ligne) : état figé visible */
                            isChecked ? (
                              <CheckSquare size={14} className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-400" : "text-slate-400"}`} />
                            ) : (
                              <Square size={14} className="flex-shrink-0 mt-0.5 text-slate-300" />
                            )
                          ) : (
                            /* Pas de session : icône neutre */
                            <CheckCircle size={14} className={`flex-shrink-0 mt-0.5 ${etape.critique ? "text-red-400" : "text-blue-400"}`} />
                          )}
                          <span className={`text-sm leading-snug ${isChecked ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {action}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )
            )}
          </div>
        ))}
      </div>

      {/* ── Journal ── */}
      {session && (
        <div className="px-4 lg:px-8">
          <button
            onClick={() => setShowJournal((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 hover:text-slate-700 transition-colors"
          >
            <MessageSquare size={13} />
            Journal d&apos;événement ({allEntries.length} entrée{allEntries.length > 1 ? "s" : ""})
            {showJournal ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showJournal && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              {/* Timeline */}
              <div
                ref={journalRef}
                className="max-h-80 overflow-y-auto divide-y divide-slate-100"
              >
                {allEntries.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-4 text-center italic">
                    Aucune entrée — cochez des actions ou ajoutez un commentaire.
                  </p>
                ) : (
                  allEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`px-4 py-3 flex gap-3 ${entry.pending ? "bg-amber-50/40 border-l-2 border-l-amber-300" : ""}`}
                    >
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
                          {entry.pending && (
                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-amber-200 text-amber-800 flex items-center gap-1">
                              <CloudUpload size={9} />
                              En attente
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 leading-snug ${entry.pending ? "text-slate-500 italic" : "text-slate-700"}`}>
                          {entry.kind === "action" ? entry.actionLabel : entry.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment input — masqué uniquement si la session est archivée */}
              {!isArchived && (
                <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => {
                        setComment(e.target.value);
                        if (speech.error) speech.clearError();
                      }}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitComment()}
                      placeholder={speech.isListening ? "Parlez…" : isOffline ? "Commentaire (envoi différé)…" : "Ajouter un commentaire terrain…"}
                      className={`flex-1 px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        speech.isListening
                          ? "border-red-300 focus:ring-red-300"
                          : "border-slate-200 focus:ring-blue-400"
                      }`}
                    />

                    {/* Mic button — hidden if browser doesn't support Speech API */}
                    {speech.isSupported && (
                      <button
                        type="button"
                        onClick={handleMicClick}
                        disabled={submittingComment}
                        title={speech.isListening ? "Arrêter la dictée" : "Dicter un commentaire (fr-FR)"}
                        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                          speech.isListening
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-slate-200 hover:bg-slate-300 text-slate-600"
                        }`}
                      >
                        {speech.isListening ? (
                          <StopIcon size={15} fill="currentColor" />
                        ) : (
                          <Mic size={15} />
                        )}
                      </button>
                    )}

                    <button
                      onClick={submitComment}
                      disabled={!comment.trim() || submittingComment}
                      className="flex items-center gap-1.5 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Send size={14} />
                      Ajouter
                    </button>
                  </div>

                  {/* Listening indicator */}
                  {speech.isListening && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium px-0.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      Écoute en cours… Parlez maintenant.
                    </div>
                  )}

                  {/* Erreurs SpeechRecognition */}
                  {speech.error && !speech.isListening && (
                    speech.error === "permission-denied" ? (
                      // Micro refusé → lien vers modal d'instructions
                      <button
                        type="button"
                        onClick={() => { speech.clearError(); setShowMicModal(true); }}
                        className="text-xs text-blue-600 hover:underline px-0.5 text-left"
                      >
                        Micro refusé — Cliquez ici pour voir comment l&apos;autoriser
                      </button>
                    ) : (
                      <p className="text-xs text-red-500 px-0.5">
                        {SPEECH_ERRORS[speech.error] ?? SPEECH_ERRORS["unknown"]}
                      </p>
                    )
                  )}

                  {/* Browser not supported (shown once user tries) */}
                  {!speech.isSupported && (
                    <p className="text-xs text-slate-400 italic px-0.5">
                      La dictée vocale n'est pas disponible sur ce navigateur.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Diagnostic microphone ── */}
      <div className="px-4 lg:px-8 pb-4">
        <MicDiagnostic />
      </div>
    </div>
  );
}
