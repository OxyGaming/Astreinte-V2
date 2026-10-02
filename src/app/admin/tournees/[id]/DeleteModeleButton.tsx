"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteModeleButton({ id, titre, realisations }: { id: string; titre: string; realisations: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const msg =
      `Supprimer définitivement le modèle « ${titre} » et ses photos ?` +
      (realisations ? `\n\nLes ${realisations} réalisation(s) existante(s) sont conservées (copie figée). Préférez « Archivé » pour simplement le retirer.` : "");
    if (!confirm(msg)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/tournees/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/tournees");
    else {
      setBusy(false);
      alert("Suppression impossible");
    }
  }

  return (
    <button onClick={onClick} disabled={busy} title="Supprimer le modèle"
      className="p-2 rounded-lg border border-gray-300 text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50">
      <Trash2 size={15} />
    </button>
  );
}
