import { requireAdminSession } from "@/lib/admin-auth";
import Link from "next/link";
import { FileSpreadsheet, MapPinned, ArrowRight, Upload } from "lucide-react";

export default async function AdminImportPage() {
  await requireAdminSession();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import de données</h1>
        <p className="text-gray-500 text-sm mt-1">
          Importez des fiches réflexes via Excel ou des points d&apos;accès via KML.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Import Fiches Excel */}
        <Link
          href="/admin/import/fiches"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
              <FileSpreadsheet size={24} className="text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 text-base mb-1">
                Import de fiches réflexes
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Créez ou mettez à jour des fiches réflexes à partir d&apos;un fichier Excel.
                Téléchargez le modèle, remplissez-le, puis importez-le.
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                Accéder à l&apos;import <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </Link>

        {/* Import KML */}
        <Link
          href="/admin/import/kml"
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <MapPinned size={24} className="text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 text-base mb-1">
                Import de points d&apos;accès (KML)
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Importez des points d&apos;accès ferroviaires depuis un fichier KML
                (Google Earth, SIG, etc.).
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                Accéder à l&apos;import <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Info box */}
      <div className="mt-8 max-w-3xl bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Upload size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Comment ça marche ?</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• <strong>Fiches Excel</strong> : téléchargez le modèle → remplissez les onglets → importez</li>
              <li>• <strong>Points KML</strong> : exportez depuis votre logiciel SIG → importez directement</li>
              <li>• Les données existantes ne sont jamais écrasées sans confirmation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
