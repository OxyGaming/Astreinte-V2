"use client";

import { X, Lock } from "lucide-react";

interface Props {
  onClose: () => void;
}

/**
 * Affiché uniquement quand getUserMedia a retourné NotAllowedError.
 * Montre les instructions pour débloquer le micro dans le navigateur.
 */
export default function MicPermissionModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={26} className="text-amber-600" />
        </div>

        <h2 className="text-base font-bold text-slate-800 text-center mb-1">
          Microphone bloqué
        </h2>
        <p className="text-sm text-slate-500 text-center mb-5 leading-relaxed">
          Le navigateur a refusé l&apos;accès au microphone.
          Autorisez-le puis réessayez.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Comment autoriser :</p>
          <p>1. Cliquez sur le <strong>cadenas 🔒</strong> à gauche de l&apos;URL</p>
          <p>2. Trouvez <strong>Microphone</strong> → passez sur <strong>Autoriser</strong></p>
          <p>3. Rechargez la page et réessayez</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
