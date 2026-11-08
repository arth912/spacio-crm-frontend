"use client";

import React from "react";
import { Menu } from "lucide-react";
import { TOGGLE_SIDEBAR_EVENT } from "./AppShell";
import NewMenu from "./NewMenu";
import ThemeToggle from "./ThemeToggle";

/** Top bar for pages inside the app shell (the dashboard keeps its own). */
export default function TopBar() {
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
      <ThemeToggle />
      <NewMenu />
    </header>
  );
}
