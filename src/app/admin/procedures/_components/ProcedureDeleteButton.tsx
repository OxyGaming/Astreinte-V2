"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProcedureDeleteButton({ id, titre }: { id: string; titre: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Supprimer la procédure "${titre}" ? Cette action est irréversible.`)) return;
    setLoading(true);
    await fetch(`/api/admin/procedures/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="Supprimer"
    >
      <Trash2 size={15} />
    </button>
  );
}
