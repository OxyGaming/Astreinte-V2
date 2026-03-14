"use client";

import { useActionState } from "react";
import { Lock, User, Eye, EyeOff, Shield } from "lucide-react";
import { adminLoginAction } from "./actions";
import { useState } from "react";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-8 text-center border-b border-gray-700">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Administration</h1>
            <p className="text-gray-400 text-sm mt-1">Espace réservé aux administrateurs</p>
          </div>

          {/* Form */}
          <form action={formAction} className="p-8 space-y-5">
            {state?.error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
                {state.error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Identifiant
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  placeholder="Nom d'utilisateur"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  placeholder="Mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg py-3 transition-colors"
            >
              {pending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Accès front-office :{" "}
          <a href="/login" className="text-gray-500 hover:text-gray-400 underline">
            /login
          </a>
        </p>
      </div>
    </div>
  );
}
