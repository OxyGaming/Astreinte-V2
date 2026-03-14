import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import AbrevForm from "../AbrevForm";

interface Props { params: Promise<{ id: string }> }

export default async function EditAbreviationPage({ params }: Props) {
  await requireAdminSession();
  const { id } = await params;
  const a = await prisma.abreviation.findUnique({ where: { id } });
  if (!a) notFound();
  return (
    <div className="p-8">
      <Link href="/admin/abreviations" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft size={16} />Retour
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Modifier : {a.sigle}</h1>
      <AbrevForm mode="edit" abreviation={a} />
    </div>
  );
}
