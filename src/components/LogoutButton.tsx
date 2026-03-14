"use client";

import { logoutAction } from "@/app/login/actions";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

interface LogoutButtonProps {
  variant?: "sidebar" | "mobile";
}

export default function LogoutButton({ variant = "sidebar" }: LogoutButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await logoutAction();
    });
  }

  if (variant === "mobile") {
    return (
      <button
        onClick={handleLogout}
        disabled={pending}
        className="flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <LogOut size={22} strokeWidth={1.8} />
        <span>{pending ? "…" : "Quitter"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={pending}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-blue-300 hover:bg-red-900/30 hover:text-red-300 transition-all disabled:opacity-50"
    >
      <LogOut size={20} strokeWidth={1.8} />
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
