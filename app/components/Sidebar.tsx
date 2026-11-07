"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calculator,
  Receipt,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { readStoredUser, StoredUser } from "../lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/catalogue", label: "Catalogue and rates", icon: BookOpen },
  { href: "/estimations", label: "Estimations", icon: Calculator },
];
const SOON = [{ href: "/billing", label: "Billing", icon: Receipt }];

interface Props {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: Props) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setUser(readStoredUser());
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("spacio-theme", next ? "dark" : "light");
    } catch {}
  };

  // The estimation builder is part of the Estimations section, so keep that item highlighted there.
  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (href === "/estimations" && pathname.startsWith("/quotation-builder"));
  // On the phone the drawer is always full width; the icon-only mode applies from lg up.
  const label = (text: string) => <span className={collapsed ? "lg:hidden" : ""}>{text}</span>;

  const link = (item: { href: string; label: string; icon: React.ElementType }, soon = false) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onCloseMobile}
        title={collapsed ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        } ${
          active
            ? "bg-amber-100 text-amber-800"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {label(item.label)}
        {soon && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ${collapsed ? "lg:hidden" : ""}`}>
            Soon
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Main navigation"
        className={`fixed inset-y-0 left-0 z-[75] bg-white border-r border-slate-200 flex flex-col p-3 transition-transform duration-200 w-[270px] ${
          collapsed ? "lg:w-[76px]" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className={`flex items-center gap-3 px-2 py-3 mb-2 ${collapsed ? "lg:justify-center" : ""}`}>
          {user?.company_logo ? (
            <img src={user.company_logo} alt="" className="w-9 h-9 object-contain rounded-lg shrink-0" />
          ) : (
            <img src="/spacio_mark.png" alt="SpaceIO" className="spacio-mark w-10 h-10 object-contain shrink-0" />
          )}
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-sm font-extrabold text-slate-900 truncate leading-tight">{user?.name || "SpaceIO"}</p>
            <p className="text-[10px] font-bold text-slate-400 tracking-wider">CRM ENGINE</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="ml-auto lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`px-3 pt-2 pb-1 text-[10px] font-bold tracking-widest text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>WORKSPACE</p>
        <nav className="flex flex-col gap-0.5">{NAV.map((n) => link(n))}</nav>

        <p className={`px-3 pt-5 pb-1 text-[10px] font-bold tracking-widest text-slate-400 ${collapsed ? "lg:hidden" : ""}`}>COMING UP</p>
        <nav className="flex flex-col gap-0.5">{SOON.map((n) => link(n, true))}</nav>

        <div className="mt-auto pt-3 border-t border-slate-200 flex flex-col gap-0.5">
          <button
            onClick={toggleTheme}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 whitespace-nowrap ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
          >
            {dark ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
            {label(dark ? "Light theme" : "Dark theme")}
          </button>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 whitespace-nowrap ${collapsed ? "justify-center px-0" : ""}`}
          >
            {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px] shrink-0" /> : <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
