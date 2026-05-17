import { requireAdminSession } from "@/lib/admin-auth";
import MainCouranteImportClient from "./MainCouranteImportClient";

export const dynamic = "force-dynamic";

export default async function AdminMainCouranteImportPage() {
  await requireAdminSession();
  return <MainCouranteImportClient />;
}
