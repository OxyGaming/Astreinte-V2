import { requireAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Phone, Edit2, Trash2 } from "lucide-react";

const categorieLabels: Record<string, { label: string; color: string }> = {
  urgence: { label: "Urgence", color: "bg-red-100 text-red-700" },
  astreinte: { label: "Astreinte", color: "bg-amber-100 text-amber-700" },
  encadrement: { label: "Encadrement", color: "bg-blue-100 text-blue-700" },
  externe: { label: "Externe", color: "bg-gray-100 text-gray-700" },
};

export default async function AdminContactsPage() {
  await requireAdminSession();
  const contacts = await prisma.contact.findMany({
    orderBy: [{ categorie: "asc" }, { nom: "asc" }],
    include: { _count: { select: { fiches: true } } },
  });

  const grouped = contacts.reduce((acc, c) => {
    if (!acc[c.categorie]) acc[c.categorie] = [];
    acc[c.categorie].push(c);
    return acc;
  }, {} as Record<string, typeof contacts>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm mt-1">{contacts.length} contact(s) enregistré(s)</p>
        </div>
        <Link
          href="/admin/contacts/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nouveau contact
        </Link>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, items]) => {
          const meta = categorieLabels[cat] || { label: cat, color: "bg-gray-100 text-gray-700" };
          return (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-sm text-gray-500">{items.length} contact(s)</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {items.map((contact) => (
                  <li key={contact.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{contact.nom}</p>
                      <p className="text-sm text-gray-500 truncate">{contact.role}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Phone size={12} className="text-gray-400" />
                        <span className="text-sm font-mono text-gray-600">{contact.telephone}</span>
                        {contact.telephoneAlt && (
                          <span className="text-xs text-gray-400 ml-1">/ {contact.telephoneAlt}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {contact._count.fiches > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          {contact._count.fiches} fiche(s)
                        </span>
                      )}
                      <Link
                        href={`/admin/contacts/${contact.id}`}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={15} />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
