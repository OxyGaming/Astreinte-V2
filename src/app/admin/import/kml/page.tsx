import { requireAdminSession } from "@/lib/admin-auth";
import KmlImportClient from "./KmlImportClient";

export default async function AdminImportKmlPage() {
  await requireAdminSession();
  return <KmlImportClient />;
}
