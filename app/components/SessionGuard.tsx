"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  API_BASE_URL,
  IDLE_MINUTES,
  IDLE_WARNING_SECONDS,
  LAST_ACTIVE_KEY,
  LOGOUT_SIGNAL_KEY,
  TOKEN_KEY,
  clearSession,
  getToken,
  performLogout,
} from "../lib/session";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "click"] as const;
const REFRESH_EVERY_MS = 20 * 60 * 1000; // renew the (2h) token while the user is active

function sentBearer(init?: RequestInit): string | null {
  try {
    const h = init?.headers;
    if (!h) return null;
    const v = h instanceof Headers ? h.get("Authorization") : (h as Record<string, string>)["Authorization"];
    return v && v.startsWith("Bearer ") ? v.slice(7) : null;
  } catch {
    return null;
  }
}

/**
 * - Signs the user out after IDLE_MINUTES without activity (with a warning countdown)
 * - Signs out immediately when a sleeping tab wakes up past the idle limit
 * - Treats any 401 from the API as "session ended" (expired / signed in elsewhere)
 * - Keeps all tabs in sync (logout in one tab logs out the rest)
 * - Slides the JWT expiry forward while the user is active
 */
export default function SessionGuard() {
  const [warningLeft, setWarningLeft] = useState<number | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const lastRefreshRef = useRef<number>(Date.now());
  const loggingOutRef = useRef(false);

  const idleMs = IDLE_MINUTES * 60 * 1000;

  const logout = useCallback((reason: "idle" | "expired") => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    // idle -> revoke on the server too; expired -> token is already dead
    performLogout(reason, { serverSide: reason === "idle" });
  }, []);

  const markActive = useCallback(() => {
    if (warningLeft !== null) return; // once the warning is up, require an explicit click
    const now = Date.now();
    lastActiveRef.current = now;
    // throttle cross-tab writes
    try {
      const prev = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0);
      if (now - prev > 5000) localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch {}
  }, [warningLeft]);

  // Activity tracking
  useEffect(() => {
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
  }, [markActive]);

  // Idle checker + sliding refresh (runs every 5s; also on tab re-focus)
  useEffect(() => {
    const tick = async () => {
      if (!getToken()) {
        setWarningLeft(null);
        return;
      }
      // another tab may have been active more recently
      let shared = 0;
      try { shared = Number(localStorage.getItem(LAST_ACTIVE_KEY) || 0); } catch {}
      const lastActive = Math.max(lastActiveRef.current, shared);
      const idleFor = Date.now() - lastActive;

      if (idleFor >= idleMs + IDLE_WARNING_SECONDS * 1000) {
        logout("idle");
        return;
      }
      if (idleFor >= idleMs) {
        setWarningLeft(Math.ceil((idleMs + IDLE_WARNING_SECONDS * 1000 - idleFor) / 1000));
        return;
      }
      setWarningLeft(null);

      // Sliding session: renew token if the user has been active recently
      if (Date.now() - lastRefreshRef.current > REFRESH_EVERY_MS) {
        lastRefreshRef.current = Date.now();
        try {
          const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
          }
          // a 401 here is handled by the global fetch wrapper below
        } catch {}
      }
    };
    const id = window.setInterval(tick, 5000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, [idleMs, logout]);

  // Global 401 handling: wrap fetch for calls to our API when we were signed in
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      try {
        if (res.status === 401) {
          const url = typeof args[0] === "string" ? args[0] : (args[0] as Request)?.url || "";
          const isAuthCall = /\/auth\/(login|register|verify-email|verify-payment|forgot-password|reset-password|create-subscription-order)/.test(url);
          if (url.startsWith(API_BASE_URL) && !isAuthCall && getToken()) {
            const sent = sentBearer(args[1]);
            if (sent && sent !== getToken()) {
              // This tab used a stale token, but another tab already signed in again: just pick up the new one.
              window.location.reload();
            } else {
              logout("expired");
            }
          }
        }
      } catch {}
      return res;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  // Cross-tab sync: logout elsewhere => logout here; login as someone else => reload
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_SIGNAL_KEY && e.newValue) {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          const reason = e.newValue.split(":")[0];
          window.location.replace(`/login?reason=${reason}`);
        }
      } else if (e.key === TOKEN_KEY && e.newValue === null) {
        if (!window.location.pathname.startsWith("/login")) window.location.replace("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (warningLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="alertdialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center">
        <h2 className="text-base font-black text-slate-800 mb-1">Still there?</h2>
        <p className="text-sm text-slate-500 mb-4">
          You have been inactive for a while. For your security you will be signed out in{" "}
          <span className="font-bold text-slate-800">{warningLeft}s</span>.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => {
              lastActiveRef.current = Date.now();
              try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch {}
              setWarningLeft(null);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
          >
            Stay signed in
          </button>
          <button
            onClick={() => performLogout("manual")}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
