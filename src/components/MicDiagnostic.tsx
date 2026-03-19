"use client";

import { useState } from "react";
import { Stethoscope, ChevronDown, ChevronUp } from "lucide-react";

interface DiagResult {
  success: boolean;
  errorName: string | null;
  errorMessage: string | null;
  url: string;
  origin: string;
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasSpeechRecognition: boolean;
}

export default function MicDiagnostic() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    // Réinitialisation à chaque clic
    setResult(null);
    setTesting(true);

    const base: Omit<DiagResult, "success" | "errorName" | "errorMessage"> = {
      url: window.location.href,
      origin: window.location.origin,
      isSecureContext: window.isSecureContext,
      hasMediaDevices: !!navigator.mediaDevices,
      hasSpeechRecognition: !!(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ),
    };

    if (!navigator.mediaDevices?.getUserMedia) {
      setResult({
        ...base,
        success: false,
        errorName: "API indisponible",
        errorMessage: "navigator.mediaDevices.getUserMedia n'existe pas dans ce contexte.",
      });
      setTesting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Libère immédiatement le micro
      stream.getTracks().forEach((t) => t.stop());
      setResult({ ...base, success: true, errorName: null, errorMessage: null });
    } catch (err) {
      const e = err as Error;
      setResult({
        ...base,
        success: false,
        errorName: e.name ?? "Inconnu",
        errorMessage: e.message ?? "Pas de message.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors bg-slate-50"
      >
        <Stethoscope size={13} />
        Diagnostic microphone
        {open ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4">
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Stethoscope size={14} />
            {testing ? "Test en cours…" : "Tester le micro"}
          </button>

          {result && (
            <div className="space-y-2 text-sm font-mono">
              {/* Résultat principal */}
              <div
                className={`px-3 py-2 rounded-lg font-bold text-sm ${
                  result.success
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {result.success ? "✓ Microphone accessible" : "✗ Accès microphone échoué"}
              </div>

              {/* Erreur détaillée */}
              {!result.success && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                  <Row label="Nom erreur" value={result.errorName ?? "—"} highlight />
                  <Row label="Message erreur" value={result.errorMessage ?? "—"} highlight />
                </div>
              )}

              {/* Contexte */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                <Row label="URL courante" value={result.url} />
                <Row label="Origine" value={result.origin} />
                <Row
                  label="Contexte sécurisé (HTTPS)"
                  value={result.isSecureContext ? "Oui ✓" : "Non ✗"}
                  ok={result.isSecureContext}
                  bad={!result.isSecureContext}
                />
                <Row
                  label="navigator.mediaDevices"
                  value={result.hasMediaDevices ? "Disponible ✓" : "Absent ✗"}
                  ok={result.hasMediaDevices}
                  bad={!result.hasMediaDevices}
                />
                <Row
                  label="SpeechRecognition"
                  value={result.hasSpeechRecognition ? "Disponible ✓" : "Absent ✗"}
                  ok={result.hasSpeechRecognition}
                  bad={!result.hasSpeechRecognition}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  ok,
  bad,
  highlight,
}: {
  label: string;
  value: string;
  ok?: boolean;
  bad?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
      <span className="text-slate-500 text-xs">{label} :</span>
      <span
        className={`text-xs break-all ${
          highlight
            ? "text-red-700 font-bold"
            : ok
            ? "text-green-700 font-semibold"
            : bad
            ? "text-red-600 font-semibold"
            : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
