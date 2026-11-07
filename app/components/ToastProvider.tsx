"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";

type ToastType = "loading" | "success" | "error";
interface ToastItem { id: number; type: ToastType; message: string }

interface ToastApi {
  /** Show a toast and return its id. `loading` toasts stay until updated or dismissed. */
  show: (message: string, type?: ToastType) => number;
  /** Change an existing toast (e.g. loading -> success). Success/error toasts then auto-close. */
  update: (id: number, message: string, type: ToastType) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const AUTO_CLOSE_MS = 4000;

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  const schedule = useCallback((id: number, type: ToastType) => {
    const old = timers.current.get(id);
    if (old) clearTimeout(old);
    timers.current.delete(id);
    if (type !== "loading") timers.current.set(id, setTimeout(() => dismiss(id), AUTO_CLOSE_MS));
  }, [dismiss]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, type, message }]);
    schedule(id, type);
    return id;
  }, [schedule]);

  const update = useCallback((id: number, message: string, type: ToastType) => {
    // If the user already closed the loading toast, still show the result.
    setToasts((list) => list.some((x) => x.id === id)
      ? list.map((x) => (x.id === id ? { ...x, message, type } : x))
      : [...list, { id, message, type }]);
    schedule(id, type);
  }, [schedule]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  const tone: Record<ToastType, string> = {
    loading: "bg-slate-800 border-slate-700",
    success: "bg-emerald-600 border-emerald-500",
    error: "bg-rose-600 border-rose-500",
  };

  return (
    <ToastContext.Provider value={{ show, update, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className={`pointer-events-auto animate-slide-in-right flex items-center gap-3 px-4 py-3 rounded-2xl border text-white shadow-xl ${tone[t.type]}`}>
            {t.type === "loading" && <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
            {t.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {t.type === "error" && <XCircle className="w-5 h-5 shrink-0" />}
            <p className="text-xs font-bold tracking-tight min-w-[180px] max-w-xs">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Close notification" className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
