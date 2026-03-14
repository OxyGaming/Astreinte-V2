import { getAllContacts } from "@/lib/db";
import PhoneButton from "@/components/PhoneButton";
import { AlertCircle, Shield, Users, Building2 } from "lucide-react";

const categorieConfig = {
  urgence: {
    label: "Urgences & Opérations",
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  astreinte: {
    label: "Astreintes",
    icon: Shield,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  encadrement: {
    label: "Encadrement",
    icon: Users,
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  externe: {
    label: "Contacts externes",
    icon: Building2,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
  },
};

const categories = ["urgence", "astreinte", "encadrement", "externe"] as const;

export default async function ContactsPage() {
  const contacts = await getAllContacts();
  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Contacts utiles</h1>
        <p className="text-sm text-slate-500 mt-1">Appuyez sur un numéro pour appeler</p>
      </div>

      <div className="px-4 py-5 space-y-6 lg:px-8">
        {categories.map((cat) => {
          const config = categorieConfig[cat];
          const Icon = config.icon;
          const contactsCat = contacts.filter((c) => c.categorie === cat);
          if (contactsCat.length === 0) return null;

          return (
            <section key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className={config.color} />
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {config.label}
                </h2>
              </div>

              <div className="card divide-y divide-slate-100">
                {contactsCat.map((c) => (
                  <div key={c.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{c.nom}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{c.role}</p>
                        {c.note && (
                          <p className="text-xs text-slate-400 mt-1 italic">{c.note}</p>
                        )}
                        {c.disponibilite && (
                          <span className="inline-block mt-1.5 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {c.disponibilite}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      <PhoneButton number={c.telephone} size="md" />
                      {c.telephone_alt && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-blue-700 text-sm">
                            {c.telephone_alt}
                          </span>
                          <span>depuis un poste fixe</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
