import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AccesForm from "../AccesForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditAccesPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;

  const point = await prisma.accesRail.findUnique({ where: { id } });
  if (!point) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin/acces"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <ChevronLeft size={16} /> Retour aux points d&apos;accès
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{point.nomAffiche}</h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">
          L.{point.ligne} · PK {point.pk}
          {point.type && ` · ${point.type}`}
        </p>
      </div>
      <AccesForm mode="edit" point={point} />
    </div>
  );
}
