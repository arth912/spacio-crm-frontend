"use client";

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, readStoredUser, storeUser, StoredUser } from "../../lib/api";
import { getToken } from "../../lib/session";
import { CLOSE_SIDEBAR_EVENT, OPEN_SIDEBAR_EVENT, TourOpenable, dispatchTourAction } from "./events";
import { TOUR_STEPS, TourStep } from "./steps";

interface ClientRow { id: string }

interface TourContextValue {
  /** Start the tour from the first step. */
  start: () => void;
  active: boolean;
}

const TourContext = createContext<TourContextValue>({ start: () => {}, active: false });
export const useTour = () => useContext(TourContext);

interface Rect { left: number; top: number; width: number; height: number }

const PAD = 6;
const MARGIN = 12;
const TIP_W = 340;
const LG = 1024;

/** Bounding box of every visible element carrying this data-tour value. */
function measure(target: string): { rect: Rect; first: HTMLElement } | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  let first: HTMLElement | null = null;
  for (const el of els) {
    const bb = el.getBoundingClientRect();
    if (bb.width === 0 && bb.height === 0) continue;
    first = first || el;
    l = Math.min(l, bb.left); t = Math.min(t, bb.top); r = Math.max(r, bb.right); b = Math.max(b, bb.bottom);
  }
  if (!first) return null;
  return { first, rect: { left: l - PAD, top: t - PAD, width: r - l + PAD * 2, height: b - t + PAD * 2 } };
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [tipSize, setTipSize] = useState({ w: TIP_W, h: 240 });
  const [vw, setVw] = useState(1200);
  const [vh, setVh] = useState(800);
  const tipRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const openedRef = useRef<TourOpenable | null>(null);
  const autoRef = useRef(false);
  const [clientId, setClientId] = useState<string | null>(null);

  // Client-page steps need a real client; without one they are left out.
  const steps = useMemo<TourStep[]>(
    () => TOUR_STEPS.filter((s) => !s.client || clientId).map((s) => (s.client ? { ...s, route: `/clients/${clientId}` } : s)),
    [clientId],
  );
  const step: TourStep = steps[Math.min(index, steps.length - 1)];
  const last = index === steps.length - 1;

  const markDone = useCallback(() => {
    const u = readStoredUser();
    if (u) storeUser({ ...u, tour_completed: true } as StoredUser);
    api("/auth/tour", { method: "PUT", body: JSON.stringify({ completed: true }) }).catch(() => {});
  }, []);

  const closeOpened = useCallback(() => {
    if (openedRef.current) dispatchTourAction(openedRef.current, false);
    openedRef.current = null;
  }, []);

  const finish = useCallback(() => {
    closeOpened();
    window.dispatchEvent(new Event(CLOSE_SIDEBAR_EVENT));
    setActive(false);
    setRect(null);
    markDone();
  }, [closeOpened, markDone]);

  const start = useCallback(() => {
    api<ClientRow[]>("/clients")
      .then((rows) => setClientId(rows[0]?.id ?? null))
      .catch(() => setClientId(null))
      .finally(() => {
        setIndex(0);
        setRect(null);
        setActive(true);
      });
  }, []);

  // First login: start once for regular users who have not seen the tour.
  useEffect(() => {
    if (autoRef.current || !getToken()) return;
    autoRef.current = true;
    const user = readStoredUser();
    if (!user || user.tour_completed === true) return;
    let cancelled = false;
    const go = () => setTimeout(() => !cancelled && start(), 900);
    if (user.tour_completed === false) { go(); return () => { cancelled = true; }; }
    // Cached user predates the flag: ask the server once.
    api<StoredUser & { tour_completed?: boolean }>("/auth/me")
      .then((me) => {
        if (cancelled) return;
        storeUser({ ...user, ...me });
        if (!me.tour_completed) go();
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [start]);

  // Per step: navigate, open the real UI it points at, and open/close the mobile drawer.
  useEffect(() => {
    if (!active) return;
    if (step.route && pathname !== step.route) {
      router.push(step.route);
      return;
    }
    const want = step.open ?? null;
    if (openedRef.current !== want) {
      if (openedRef.current) dispatchTourAction(openedRef.current, false);
      if (want) setTimeout(() => dispatchTourAction(want, true), 60);
      openedRef.current = want;
    }
    if (window.innerWidth < LG) {
      window.dispatchEvent(new Event(step.target?.startsWith("nav-") ? OPEN_SIDEBAR_EVENT : CLOSE_SIDEBAR_EVENT));
    }
  }, [active, index, pathname, step, router]);

  // Track the target's position every frame (covers scrolling, animation, late-mounting content).
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let started = performance.now();
    let scrolled = false;
    const onRoute = !step.route || pathname === step.route;
    const tick = () => {
      setVw(window.innerWidth); setVh(window.innerHeight);
      if (step.target && onRoute) {
        const m = measure(step.target);
        if (m) {
          if (!scrolled) {
            scrolled = true;
            const bb = m.first.getBoundingClientRect();
            if (bb.top < 70 || bb.bottom > window.innerHeight - 20) m.first.scrollIntoView({ block: "center", behavior: "smooth" });
          }
          setRect((prev) => (sameRect(prev, m.rect) ? prev : m.rect));
        } else if (performance.now() - started > 3500) {
          setRect((prev) => (prev === null ? prev : null));
        }
      } else {
        setRect((prev) => (prev === null ? prev : null));
      }
      raf = requestAnimationFrame(tick);
    };
    started = performance.now();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, index, pathname, step]);

  useLayoutEffect(() => {
    if (!active || !tipRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = tipRef.current;
    setTipSize((p) => (Math.abs(p.w - w) > 1 || Math.abs(p.h - h) > 1 ? { w, h } : p));
  });

  useEffect(() => { if (active) nextRef.current?.focus(); }, [active, index]);

  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(steps.length - 1, n))), [steps.length]);
  const next = useCallback(() => (last ? finish() : go(index + 1)), [last, finish, go, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      else if (e.key === "Tab" && tipRef.current) {
        const f = Array.from(tipRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")).filter((b) => b.offsetParent !== null);
        if (!f.length) return;
        const firstEl = f[0], lastEl = f[f.length - 1];
        if (!tipRef.current.contains(document.activeElement)) { e.preventDefault(); firstEl.focus(); }
        else if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [active, finish, next, go, index]);

  // Tooltip position: preferred side, flip if it does not fit, else dock.
  const tipPos = useMemo(() => {
    const { w, h } = tipSize;
    if (vw < 640) {
      const top = rect && rect.top + rect.height / 2 > vh / 2 ? MARGIN : vh - h - MARGIN;
      return { left: MARGIN, top, width: vw - MARGIN * 2 };
    }
    if (!rect) return { left: (vw - w) / 2, top: (vh - h) / 2, width: undefined as number | undefined };
    const cl = (v: number, lo: number, hi: number) => Math.min(Math.max(lo, v), Math.max(lo, hi));
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const place: Record<string, [number, number]> = {
      right: [rect.left + rect.width + 16, cl(cy - h / 2, MARGIN, vh - h - MARGIN)],
      left: [rect.left - w - 16, cl(cy - h / 2, MARGIN, vh - h - MARGIN)],
      bottom: [cl(cx - w / 2, MARGIN, vw - w - MARGIN), rect.top + rect.height + 14],
      top: [cl(cx - w / 2, MARGIN, vw - w - MARGIN), rect.top - h - 14],
    };
    const order = { right: ["right", "left", "bottom", "top"], left: ["left", "right", "bottom", "top"], bottom: ["bottom", "top", "right", "left"], top: ["top", "bottom", "right", "left"] }[step.side || "right"];
    for (const k of order) {
      const [x, y] = place[k];
      if (x >= MARGIN - 1 && y >= MARGIN - 1 && x + w <= vw - MARGIN + 1 && y + h <= vh - MARGIN + 1) return { left: x, top: y, width: undefined };
    }
    return { left: cl(cx - w / 2, MARGIN, vw - w - MARGIN), top: vh - h - MARGIN, width: undefined };
  }, [rect, tipSize, vw, vh, step.side]);

  const value = useMemo(() => ({ start, active }), [start, active]);
  const welcome = index === 0;

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <div className="fixed inset-0 z-[9000]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
          {/* Swallows clicks so the greyed-out page cannot be used during the tour. */}
          <div className="absolute inset-0" />
          <div
            aria-hidden="true"
            className="fixed pointer-events-none rounded-2xl transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{
              left: rect ? rect.left : vw / 2,
              top: rect ? rect.top : vh / 2,
              width: rect ? rect.width : 0,
              height: rect ? rect.height : 0,
              boxShadow: "0 0 0 9999px rgba(28,25,23,0.64)",
              outline: rect ? "2px solid #fbbf24" : "none",
              outlineOffset: 2,
            }}
          />
          <div
            ref={tipRef}
            className="fixed bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl p-5 transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
            style={{ left: tipPos.left, top: tipPos.top, width: tipPos.width ?? TIP_W, maxWidth: "calc(100vw - 24px)" }}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className="text-amber-700">{welcome ? "Getting started" : `Step ${index} of ${steps.length - 1}`}</span>
              <span className="text-slate-400">{welcome ? "" : step.tag}</span>
            </div>
            <h2 id="tour-title" className="mt-1.5 text-lg font-extrabold tracking-tight text-slate-900">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.body}</p>
            <div className="flex gap-[3px] my-4" aria-hidden="true">
              {steps.map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i === index ? "bg-amber-600" : i < index ? "bg-amber-600/40" : "bg-slate-200"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={finish}
                className={`mr-auto px-1.5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded ${last ? "invisible" : ""}`}
              >
                Skip tour
              </button>
              {index > 0 && (
                <button
                  onClick={() => go(index - 1)}
                  className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  Previous
                </button>
              )}
              <button
                ref={nextRef}
                onClick={next}
                className="h-10 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                {welcome ? "Start tour" : last ? "Finish" : "Next"}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400 hidden sm:block">Use the arrow keys to move, Esc to skip.</p>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
