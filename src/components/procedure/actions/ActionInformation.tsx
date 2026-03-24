import { Info } from "lucide-react";
import type { ActionMetier } from "@/lib/procedure/types";

export default function ActionInformation({ action }: { action: ActionMetier }) {
  return (
    <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
      <Info size={18} className="flex-shrink-0 mt-0.5 text-blue-600" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-blue-900">{action.label}</p>
        {action.description && (
          <p className="text-xs text-blue-700 leading-relaxed">{action.description}</p>
        )}
        {action.note && (
          <p className="text-xs text-amber-700 font-medium mt-1">{action.note}</p>
        )}
      </div>
    </div>
  );
}
