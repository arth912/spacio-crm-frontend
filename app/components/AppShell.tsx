"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { getToken } from "../lib/session";
import { TourProvider } from "./tour/TourProvider";
import { CLOSE_SIDEBAR_EVENT } from "./tour/events";

const COLLAPSE_KEY = "spacio-sidebar-collapsed";
export const TOGGLE_SIDEBAR_EVENT = "spacio:toggle-sidebar";

/** Sidebar plus a content column. Pages inside render their own top bar. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
    const open = () => setMobileOpen(true);
    const close = () => setMobileOpen(false);
    window.addEventListener(TOGGLE_SIDEBAR_EVENT, open);
    window.addEventListener(CLOSE_SIDEBAR_EVENT, close);
    return () => {
      window.removeEventListener(TOGGLE_SIDEBAR_EVENT, open);
      window.removeEventListener(CLOSE_SIDEBAR_EVENT, close);
    };
  }, []);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <TourProvider>
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggleCollapse}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`transition-[padding] duration-200 ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}>{children}</div>
    </div>
    </TourProvider>
  );
}
