import Link from "next/link";
import { Clock, CheckCircle, XCircle, ChevronRight, Upload, Tag } from "lucide-react";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAllMainCourantes } from "@/lib/db";
import type { MainCouranteStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>;
}

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminMainCourantePage({ searchParams }: Props) {
  await requireAdminSession();

  const { status, q } = await searchParams;
  const entries = await getAllMainCourantes(status, q);

  const counts = {
    all: (await getAllMainCourantes()).length,
    pending: (await getAllMainCourantes("pending")).length,
    validated: (await getAllMainCourantes("validated")).length,
    rejected: (await getAllMainCourantes("rejected")).length,
  };

  const tabs = [
    { key: "", label: "Toutes", count: counts.all },
    { key: "pending", label: "En attente", count: counts.pending },
    { key: "validated", label: "Validées", count: counts.validated },
    { key: "rejected", label: "Rejetées", count: counts.rejected },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Main courante</h1>
          <p className="text-sm text-slate-500 mt-1">
            Modérez les contributions et complétez les avis sécurité / production.
          </p>
        </div>
        <Link
          href="/admin/main-courante/import"
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Upload size={14} />
          Importer Excel
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap mb-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/main-courante${tab.key ? `?status=${tab.key}` : ""}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (status ?? "") === tab.key
                ? "bg-blue-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              (status ?? "") === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-500"
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Liste */}
      {entries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-500">Aucune entrée dans cette catégorie.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/admin/main-courante/${entry.id}`}
              className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[entry.status]}`}>
                    {entry.status === "pending" && <Clock size={10} />}
                    {entry.status === "validated" && <CheckCircle size={10} />}
                    {entry.status === "rejected" && <XCircle size={10} />}
                    {STATUS_LABEL[entry.status]}
                  </span>
                  {entry.nature && (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[11px] font-bold px-1.5 py-0.5 rounded">
                      <Tag size={9} />
                      {entry.nature}
                    </span>
                  )}
                  {entry.libelle && (
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-xs">
                      {entry.libelle}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                  <span className="text-xs text-slate-400">
                    par {entry.auteurPrenom} {entry.auteurNom}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm group-hover:text-blue-800 transition-colors">
                  {entry.titre || (
                    <span className="italic text-slate-400 font-normal">Sans titre</span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {entry.description}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
