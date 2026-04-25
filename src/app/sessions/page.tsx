import { requireUserSession } from "@/lib/user-auth";
import { getSessionsForUser } from "@/lib/db";
import Link from "next/link";
import { Clock, Archive, Play, ChevronRight, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function SessionsPage() {
  const user = await requireUserSession();
  const sessions = await getSessionsForUser(user.id, user.role as "USER" | "EDITOR" | "ADMIN");
  const isSupervisor = user.role === "ADMIN" || user.role === "EDITOR";

  const active = sessions.filter((s) => s.status === "active");
  const archived = sessions.filter((s) => s.status === "archived");

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl px-4 py-5 lg:px-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Événements</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSupervisor
            ? "Sessions de tous les utilisateurs (mode supervision)."
            : "Vos sessions de fiches réflexes en cours et archivées."}
        </p>
      </div>

      {/* Sessions actives */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          En cours ({active.length})
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucune session active.</p>
        ) : (
          <div className="space-y-2">
            {active.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 bg-white border border-green-200 rounded-xl px-4 py-3 hover:bg-green-50 transition-colors"
              >
                <div className="flex-shrink-0 w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{s.ficheTitre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Démarré le {formatDateTime(s.startedAt)} — {s.createdByPrenom} {s.createdByNom}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Sessions archivées */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Archive size={12} />
          Archivées ({archived.length})
        </h2>
        {archived.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Aucune session archivée.</p>
        ) : (
          <div className="space-y-2">
            {archived.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-shrink-0 w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText size={16} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{s.ficheTitre}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDateTime(s.startedAt)}
                    {s.endedAt ? ` → ${formatDateTime(s.endedAt)}` : ""}
                    {" — "}{s.createdByPrenom} {s.createdByNom}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
