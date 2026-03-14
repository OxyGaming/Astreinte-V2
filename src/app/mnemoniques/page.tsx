import { getAllMnemoniques } from "@/lib/db";
import MnemoniquesClient from "./MnemoniquesClient";

export default async function MnemoniquesPage() {
  const mnemoniques = await getAllMnemoniques();

  return (
    <div className="max-w-2xl mx-auto lg:max-w-3xl">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="text-xl font-bold text-slate-900">Mnémotechniques</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acronymes procéduraux — Appuyez pour développer
        </p>
      </div>

      <MnemoniquesClient mnemoniques={mnemoniques} />
    </div>
  );
}
