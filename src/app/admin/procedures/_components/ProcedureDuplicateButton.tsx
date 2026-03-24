"use client";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProcedureDuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/procedures/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const { id: newId } = await res.json();
      router.push(`/admin/procedures/${newId}/edit`);
    } else {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
      title="Dupliquer"
    >
      <Copy size={15} />
    </button>
  );
}
