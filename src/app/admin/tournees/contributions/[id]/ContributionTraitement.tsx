"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { CONTRIBUTION_STATUTS, CONTRIBUTION_STATUT_LABELS } from "@/lib/tournee/contributions";

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ContributionTraitement({
  id, statut, assigneeId, traiteLe, gestionnaires,
}: {
  id: string;
  statut: string;
  assigneeId: string | null;
  traiteLe: string | null;
  gestionnaires: { id: string; nom: string; role: string }[];
}) {
  const router = useRouter();
  const [s, setS] = useState(statut);
  const [a, setA] = useState(assigneeId ?? "");
  const [d, setD] = useState(traiteLe ?? "");
  const [commentaire, setCommentaire] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    const body: Record<string, unknown> = {};
    if (s !== statut) body.statut = s;
    if (a !== (assigneeId ?? "")) body.assigneeId = a || null;
    if (d !== (traiteLe ?? "")) body.traiteLe = d || null;
    if (commentaire.trim()) body.commentaire = commentaire;
    if (!Object.keys(body).length) return setMsg({ ok: false, text: "Aucune modification" });
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/tournees/contributions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Erreur" });
    setCommentaire("");
    setMsg({ ok: true, text: "Enregistré" });
    router.refresh();
  }

  return (
    <aside className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4 h-fit lg:sticky lg:top-6">
      <h2 className="font-semibold text-gray-900">Traitement</h2>
      <label className="block text-sm">
        <span className="text-gray-600">Statut</span>
        <select className={`${inputCls} mt-1`} value={s} onChange={(e) => setS(e.target.value)}>
          {CONTRIBUTION_STATUTS.map((x) => <option key={x} value={x}>{CONTRIBUTION_STATUT_LABELS[x]}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Affectée à</span>
        <select className={`${inputCls} mt-1`} value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">— Personne —</option>
          {gestionnaires.map((u) => <option key={u.id} value={u.id}>{u.nom}{u.role !== "USER" ? ` (${u.role === "ADMIN" ? "admin" : "éditeur"})` : ""}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Date de traitement</span>
        <input type="date" className={`${inputCls} mt-1`} value={d} onChange={(e) => setD(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Commentaire</span>
        <textarea className={`${inputCls} mt-1 resize-y`} rows={4} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Analyse, action menée, réponse…" />
      </label>
      {msg && (
        <p className={`text-sm flex items-center gap-1.5 ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {msg.text}
        </p>
      )}
      <button onClick={save} disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg">
        <Save size={14} /> {busy ? "Enregistrement…" : "Enregistrer"}
      </button>
      <p className="text-xs text-gray-400">Chaque modification est conservée dans l&apos;historique.</p>
    </aside>
  );
}
