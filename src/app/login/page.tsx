"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";
import { Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Suspense, useState } from "react";

function LoginPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [tab, setTab] = useState<"login" | "register">("login");

  // Login
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, null);

  // Register
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registerPending, setRegisterPending] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
    confirmPassword: "",
    motif: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setRegisterError(null);
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError(null);

    if (form.password !== form.confirmPassword) {
      setRegisterError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.motif.trim().length < 10) {
      setRegisterError("Le motif doit contenir au moins 10 caractères.");
      return;
    }

    setRegisterPending(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setRegisterError(json.error ?? "Une erreur est survenue.");
      } else {
        setRegisterSuccess(true);
      }
    } catch {
      setRegisterError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setRegisterPending(false);
    }
  }

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
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "login"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setTab("register")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                tab === "register"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Demande d&apos;accès
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {tab === "login" ? (
              /* ── LOGIN ── */
              <form
                action={loginFormAction}
                onSubmit={() => {
                  // Signal au OfflineIndicator de précacher immédiatement après redirect
                  try { sessionStorage.setItem("astreinte:freshLogin", "1"); } catch {}
                }}
                className="space-y-4"
              >
                <input type="hidden" name="from" value={from} />

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="votre@email.fr"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {loginState?.error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    <span className="shrink-0">⚠</span>
                    {loginState.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginPending}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {loginPending ? "Connexion…" : "Se connecter"}
                </button>
              </form>
            ) : registerSuccess ? (
              /* ── SUCCESS ── */
              <div className="text-center py-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Demande envoyée !</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  Votre demande a bien été enregistrée. Elle sera examinée par un administrateur
                  avant activation de votre compte.
                </p>
                <button
                  onClick={() => { setTab("login"); setRegisterSuccess(false); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              /* ── REGISTER ── */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 leading-relaxed">
                  Votre demande sera examinée par un administrateur avant activation de votre compte.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Prénom
                    </label>
                    <input
                      id="prenom"
                      name="prenom"
                      type="text"
                      required
                      value={form.prenom}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom
                    </label>
                    <input
                      id="nom"
                      name="nom"
                      type="text"
                      required
                      value={form.nom}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adresse e-mail
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="votre@email.fr"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Mot de passe{" "}
                    <span className="text-slate-400 font-normal">(min. 8 caractères)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="••••••••"
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

                <div>
                  <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="reg-confirm"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="motif" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Motif de la demande{" "}
                    <span className="text-slate-400 font-normal">(min. 10 caractères)</span>
                  </label>
                  <textarea
                    id="motif"
                    name="motif"
                    rows={3}
                    required
                    minLength={10}
                    value={form.motif}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    placeholder="Précisez votre fonction et la raison de votre demande d'accès..."
                  />
                </div>

                {registerError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                    <span className="shrink-0">⚠</span>
                    {registerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerPending}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {registerPending ? "Envoi en cours…" : "Envoyer la demande"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-blue-400 text-xs text-center mt-6">
          Accès réservé aux agents autorisés
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
