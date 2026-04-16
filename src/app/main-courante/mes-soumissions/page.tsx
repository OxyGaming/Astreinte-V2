import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/user-auth";
import { getUserMainCourantes } from "@/lib/db";
import type { MainCouranteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<MainCouranteStatus, string> = {
  pending: "En attente",
  validated: "Validée",
  rejected: "Rejetée",
};

const STATUS_STYLE: Record<MainCouranteStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  validated: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_ICON: Record<MainCouranteStatus, React.ReactNode> = {
  pending: <Clock size={12} />,
  validated: <CheckCircle size={12} />,
  rejected: <XCircle size={12} />,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MesSoumissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?from=/main-courante/mes-soumissions");

  const entries = await getUserMainCourantes(user.id);

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      <div className="px-4 pt-5 pb-5 lg:px-8 bg-blue-900 text-white">
        <Link
          href="/main-courante"
          className="flex items-center gap-1 text-sm opacity-80 hover:opacity-100 mb-4 transition-opacity"
        >
          <ArrowLeft size={16} />
          Main courante
        </Link>
        <h1 className="text-xl font-bold leading-tight">Mes soumissions</h1>
        <p className="text-sm opacity-80 mt-1">
          Historique de vos contributions et leur statut de validation.
        </p>
      </div>

      <div className="py-5 px-4 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {entries.length} contribution{entries.length > 1 ? "s" : ""}
          </p>
          <Link
            href="/main-courante/new"
            className="text-sm text-blue-700 font-medium hover:underline"
          >
            + Nouvelle contribution
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <BookOpen size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Vous n&apos;avez encore rien soumis.</p>
            <Link
              href="/main-courante/new"
              className="inline-block mt-3 text-sm text-blue-700 font-medium hover:underline"
            >
              Faire une première contribution →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[entry.status]}`}
                      >
                        {STATUS_ICON[entry.status]}
                        {STATUS_LABEL[entry.status]}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">{entry.titre}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {entry.description}
                    </p>
                    {entry.status === "rejected" && entry.rejetMotif && (
                      <p className="text-xs text-red-600 mt-1.5 bg-red-50 rounded-lg px-2 py-1">
                        Motif : {entry.rejetMotif}
                      </p>
                    )}
                    {entry.status === "validated" && (
                      <Link
                        href={`/main-courante/${entry.id}`}
                        className="inline-block mt-1.5 text-xs text-blue-700 font-medium hover:underline"
                      >
                        Voir l&apos;entrée publiée →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
