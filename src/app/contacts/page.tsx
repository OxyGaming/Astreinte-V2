import { getAllContacts } from "@/lib/db";
import ContactCard from "@/components/ContactCard";
import { AlertCircle, Shield, Users, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

const categorieConfig = {
  urgence: {
    label: "Urgences & Opérations",
    icon: AlertCircle,
    color: "text-red-600",
  },
  astreinte: {
    label: "Astreintes",
    icon: Shield,
    color: "text-blue-700",
  },
  encadrement: {
    label: "Encadrement",
    icon: Users,
    color: "text-purple-700",
  },
  externe: {
    label: "Contacts externes",
    icon: Building2,
    color: "text-slate-600",
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
                  <ContactCard
                    key={c.id}
                    contact={c}
                    mode="compact"
                    showLink={true}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
