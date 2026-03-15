import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import FichesImportClient from "./FichesImportClient";

export default async function AdminImportFichesPage() {
  await requireAdminSession();

  const contacts = await prisma.contact.findMany({
    select: { id: true, nom: true, categorie: true },
    orderBy: { nom: "asc" },
  });

  const secteurs = await prisma.secteur.findMany({
    select: { id: true, slug: true, nom: true },
    orderBy: { nom: "asc" },
  });

  return <FichesImportClient contacts={contacts} secteurs={secteurs} />;
}
