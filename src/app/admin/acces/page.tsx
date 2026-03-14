import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit2, Plus, MapPin } from "lucide-react";

interface Props {
  searchParams: Promise<{ q?: string; ligne?: string; page?: string }>;
}

export default async function AdminAccesPage({ searchParams }: Props) {
  await requireAdminSession();
  const { q = "", ligne = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSize = 50;
  const skip = (pageNum - 1) * pageSize;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (ligne) where.ligne = ligne;
  if (q) {
    where.OR = [
      { nomComplet: { contains: q } },
      { pk: { contains: q } },
      { identifiant: { contains: q } },
      { type: { contains: q } },
    ];
  }

  const [total, points, lignesRows] = await Promise.all([
    prisma.accesRail.count({ where }),
    prisma.accesRail.findMany({
      where,
      orderBy: [{ ligne: "asc" }, { pk: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.accesRail.findMany({
      select: { ligne: true },
      distinct: ["ligne"],
      orderBy: { ligne: "asc" },
    }),
  ]);

  const lignes = lignesRows.map((r) => r.ligne);
  const totalPages = Math.ceil(total / pageSize);

  const buildUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(ligne && { ligne }), page: String(pageNum) });
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/admin/acces?${p.toString()}`;
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Points d&apos;accès</h1>
          <p className="text-gray-500 text-sm mt-1">{total.toLocaleString("fr-FR")} point(s)</p>
        </div>
        <Link
          href="/admin/acces/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouveau point
        </Link>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap items-center">
        <form method="GET" action="/admin/acces" className="flex gap-3 flex-1 min-w-0">
          {ligne && <input type="hidden" name="ligne" value={ligne} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher (PK, nom, type…)"
            className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors">
            Rechercher
          </button>
        </form>

        <div className="flex gap-2 flex-wrap">
          <Link
            href={buildUrl({ ligne: "", page: "1" })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!ligne ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Toutes
          </Link>
          {lignes.map((l) => (
            <Link
              key={l}
              href={buildUrl({ ligne: l, page: "1" })}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-colors ${ligne === l ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3.5 font-medium text-gray-600">Nom affiché</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-28">Ligne</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-28">PK</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-20">Type</th>
              <th className="text-left px-4 py-3.5 font-medium text-gray-600 w-20">Source</th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {points.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <MapPin size={24} className="mx-auto mb-2 opacity-40" />
                  Aucun point trouvé
                </td>
              </tr>
            )}
            {points.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5 font-medium text-gray-900">
                  {p.nomAffiche}
                  {p.identifiant && p.identifiant !== p.nomAffiche && (
                    <span className="text-gray-400 font-normal ml-1 text-xs">{p.identifiant}</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-mono">{p.ligne}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-gray-600 text-xs">{p.pk}</td>
                <td className="px-4 py-3.5">
                  {p.type && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{p.type}</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.source === "KML" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                    {p.source}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/admin/acces/${p.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                    title="Modifier"
                  >
                    <Edit2 size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Page {pageNum} / {totalPages}</span>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <Link href={buildUrl({ page: String(pageNum - 1) })} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                ← Précédent
              </Link>
            )}
            {pageNum < totalPages && (
              <Link href={buildUrl({ page: String(pageNum + 1) })} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Suivant →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
