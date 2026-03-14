"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-blue-800/60 rounded-2xl border border-blue-700 mb-4">
            <Shield size={40} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Astreinte</h1>
          <p className="text-blue-300 text-sm mt-1">UOC Zone Diffuse</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Connexion</h2>
          <p className="text-sm text-slate-500 mb-6">
            Accès réservé aux agents autorisés.
          </p>

          <form action={formAction} className="space-y-4">
            {/* Champ caché pour la redirection */}
            <input type="hidden" name="from" value={from} />

            {/* Identifiant */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Identifiant
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Votre identifiant"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {state?.error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                <span className="shrink-0">⚠</span>
                {state.error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-blue-800 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm mt-2"
            >
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-blue-400 text-xs text-center mt-6">
          Secteur Gier / Rive Droite Nord
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
