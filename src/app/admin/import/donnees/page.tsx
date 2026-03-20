import { requireAdminSession } from "@/lib/admin-auth";
import DonneesImportClient from "./DonneesImportClient";

export default async function DonneesImportPage() {
  await requireAdminSession();
  return <DonneesImportClient />;
}
