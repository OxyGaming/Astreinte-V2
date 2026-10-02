"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/components/ConfirmDialog";

export default function DeleteModeleButton({ id, titre, realisations }: { id: string; titre: string; realisations: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dialog, ask } = useConfirmDialog();

  async function onClick() {
    const ok = await ask({
      title: `Supprimer le modèle « ${titre} » ?`,
      description:
        "Le modèle et ses photos seront supprimés définitivement." +
        (realisations
          ? `\nLes ${realisations} réalisation(s) existante(s) sont conservées (copie figée). Préférez le statut « Archivé » pour simplement le retirer.`
          : ""),
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/tournees/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/tournees");
    else {
      setBusy(false);
      setError("Suppression impossible");
    }
  }

  return (
    <>
      {dialog}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button onClick={onClick} disabled={busy} title="Supprimer le modèle"
        className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50">
        <Trash2 size={15} />
      </button>
    </>
  );
}
