"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, UserCircle, Settings, Compass } from "lucide-react";
import { readStoredUser, StoredUser } from "../lib/api";
import { useTour } from "./tour/TourProvider";
import { TOUR_ACTION_EVENT } from "./tour/events";

/** Avatar row for the bottom of the sidebar. Opens a menu upward with My Profile and user admin. */
export default function ProfileMenu({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tour = useTour();

  useEffect(() => setUser(readStoredUser()), []);

  // The onboarding tour opens this menu to point at the Tour Guide item.
  useEffect(() => {
    const onAction = (e: Event) => {
      const d = (e as CustomEvent<{ type: string; open: boolean }>).detail;
      if (d?.type === "profile-menu") setOpen(d.open);
    };
    window.addEventListener(TOUR_ACTION_EVENT, onAction);
    return () => window.removeEventListener(TOUR_ACTION_EVENT, onAction);
  }, []);

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

  const name = user?.name || "SpaceIO user";

  return (
    <div className="relative" ref={ref}>
      <button
        data-tour="profile-menu"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? name : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
      >
        <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-md uppercase">
          {name[0]}
        </span>
        <span className={`min-w-0 flex-1 text-left ${collapsed ? "lg:hidden" : ""}`}>
          <span className="block text-sm font-bold text-slate-800 truncate">{name}</span>
          <span className="block text-[11px] text-slate-400 truncate">{user?.role || "Account"}</span>
        </span>
        <ChevronUp className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? "" : "rotate-180"} ${collapsed ? "lg:hidden" : ""}`} />
      </button>
      {open && (
        <div role="menu" data-tour="profile-menu" className="absolute bottom-full left-0 mb-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-black text-slate-800 truncate">{name}</p>
            <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 rounded-xl"
            >
              <UserCircle className="w-4 h-4 text-slate-400" />
              My Profile
            </Link>
            {(
              <button
                role="menuitem"
                onClick={() => { setOpen(false); onNavigate?.(); tour.start(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 rounded-xl"
              >
                <Compass className="w-4 h-4 text-slate-400" />
                Tour Guide
              </button>
            )}
            {user?.role === "Admin" && (
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 rounded-xl"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
