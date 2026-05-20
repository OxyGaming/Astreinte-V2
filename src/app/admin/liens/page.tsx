import { requireAdminSession } from "@/lib/admin-auth";
import { getAllLiens, getAllLienCategories } from "@/lib/db";
import LienCategoriesManager from "./LienCategoriesManager";
import LiensCollectionManager from "./LiensCollectionManager";

export const dynamic = "force-dynamic";

export default async function AdminLiensPage() {
  await requireAdminSession();
  const [liens, categories] = await Promise.all([getAllLiens(), getAllLienCategories()]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Liens utiles</h1>
        <p className="text-gray-500 text-sm mt-1">
          Thématiques et collection de liens de la page hub « Liens utiles ».
        </p>
      </div>
      <div className="max-w-3xl space-y-6">
        <LienCategoriesManager initialCategories={categories} />
        <LiensCollectionManager initialLiens={liens} categories={categories} />
      </div>
    </div>
  );
}
