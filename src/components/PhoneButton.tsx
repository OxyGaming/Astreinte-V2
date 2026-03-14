"use client";

import { Phone, Copy, Check } from "lucide-react";
import { useState } from "react";

interface PhoneButtonProps {
  number: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function PhoneButton({ number, label, size = "md" }: PhoneButtonProps) {
  const [copied, setCopied] = useState(false);
  const cleaned = number.replace(/\s/g, "");

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    await navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses = {
    sm: "text-sm py-2 px-3 gap-2",
    md: "text-base py-3 px-4 gap-2",
    lg: "text-lg py-4 px-5 gap-3",
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={`tel:${cleaned}`}
        className={`flex items-center font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition-colors ${sizeClasses[size]}`}
      >
        <Phone size={size === "sm" ? 14 : size === "lg" ? 22 : 18} strokeWidth={2.5} />
        <span>{label ?? number}</span>
      </a>
      <button
        onClick={handleCopy}
        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Copier le numéro"
      >
        {copied ? (
          <Check size={16} className="text-green-600" />
        ) : (
          <Copy size={16} />
        )}
      </button>
    </div>
  );
}
