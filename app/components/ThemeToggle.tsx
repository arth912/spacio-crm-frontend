"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Light/dark switch for the top bar. The `dark` class on <html> drives the theme; the choice is remembered. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("spacio-theme", next ? "dark" : "light");
    } catch {}
  };

  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      onClick={toggle}
      title={label}
      aria-label={label}
      className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
    >
      {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}
