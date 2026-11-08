"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, FileText, Receipt } from "lucide-react";

const ITEMS = [
  { href: "/quotation-builder", label: "New Estimate", hint: "Quote a job for a customer", icon: FileText },
  { href: "/billing/new", label: "New Billing", hint: "Create a bill using your template", icon: Receipt },
];

/** "+ New" button with a dropdown for the things you can create. */
export default function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold px-3.5 h-10 sm:px-5 rounded-xl shadow-md transition-all text-sm"
      >
        + New
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2">
          {ITEMS.map(({ href, label, hint, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 focus:bg-amber-50 focus:outline-none"
            >
              <span className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-800">{label}</span>
                <span className="block text-xs text-slate-500 truncate">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
