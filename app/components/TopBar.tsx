"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Menu, Plus, Users } from "lucide-react";
import { readStoredUser, StoredUser } from "../lib/api";
import { performLogout } from "../lib/session";
import { TOGGLE_SIDEBAR_EVENT } from "./AppShell";

/** Top bar for pages inside the app shell (the dashboard keeps its own). */
export default function TopBar() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(readStoredUser());
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/60 px-4 md:px-10 h-16 flex items-center gap-3">
      <button
        onClick={() => window.dispatchEvent(new Event(TOGGLE_SIDEBAR_EVENT))}
        className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <Link
        href="/quotation-builder"
        className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-md transition-all text-xs sm:text-sm"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">New Quotation</span>
      </Link>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 focus:outline-none hover:opacity-85"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-md uppercase">
            {(user?.name || "U")[0]}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-2">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-black text-slate-800 truncate">{user?.name || "SpaceIO user"}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="p-1">
              {user?.role === "Admin" && (
                <Link
                  href="/users"
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 rounded-xl"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Users management
                </Link>
              )}
              <button
                onClick={() => performLogout("manual")}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl text-left"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
