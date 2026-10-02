import Link from "next/link";

const TABS = [
  { key: "modeles", href: "/admin/tournees", label: "Modèles" },
  { key: "realisations", href: "/admin/tournees/realisations", label: "Réalisations" },
  { key: "contributions", href: "/admin/tournees/contributions", label: "Contributions" },
] as const;

export default function TourneesAdminTabs({
  active,
  showModeles = true,
}: {
  active: (typeof TABS)[number]["key"];
  /** Les EDITOR n'accèdent qu'aux contributions. */
  showModeles?: boolean;
}) {
  const tabs = showModeles ? TABS : TABS.filter((t) => t.key === "contributions");
  return (
    <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === t.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
