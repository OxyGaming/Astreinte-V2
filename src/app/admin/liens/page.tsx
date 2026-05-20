import { requireAdminSession } from "@/lib/admin-auth";
import { getAllLiens } from "@/lib/db";
import LiensCollectionManager from "./LiensCollectionManager";

export const dynamic = "force-dynamic";

export default async function AdminLiensPage() {
  await requireAdminSession();
  const liens = await getAllLiens();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Liens utiles</h1>
        <p className="text-gray-500 text-sm mt-1">
          Collection centrale de liens, réutilisable dans les fiches, secteurs, postes et procédures.
        </p>
      </div>
      <div className="max-w-3xl">
        <LiensCollectionManager initialLiens={liens} />
      </div>
    </div>
  );
}
