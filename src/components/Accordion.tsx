"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: "red" | "blue" | "amber" | "green";
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  badge,
  badgeColor = "blue",
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeClasses = {
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{title}</span>
          {badge && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClasses[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}
