'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw, Home, AlertCircle, Plus } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    console.error("Spacio CRM Runtime Error Caught:", error);
    try {
      const rawUser = localStorage.getItem("decocrm_user");
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
    } catch (e) {
      console.error(e);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* TOP NAV BAR */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 md:px-10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {user?.company_logo ? (
              <img 
                src={user.company_logo} 
                alt="Logo" 
                className="w-9 h-9 object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[15px] flex items-center justify-center shadow-md uppercase shrink-0">
                {(user?.name || "S")[0]}
              </div>
            )}
            <div className="border-l border-slate-200 pl-3">
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{user?.name || "Spacio"}</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">CRM ENGINE</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <a 
              href="/dashboard" 
              className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-xs"
            >
              Go to Dashboard
            </a>
            
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold text-[13px] flex items-center justify-center shadow-md uppercase">
              {(user?.name || "U")[0]}
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <main className="flex-1 py-8 px-6 md:px-10 max-w-7xl mx-auto w-full">
        
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            Something went wrong 🤕
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Here's the crash diagnostic and session status report for your Spacio CRM instance.</p>
        </div>

        {/* Dashboard Grid Template */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Error Illustration and Action Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm col-span-1 lg:col-span-2 flex flex-col md:flex-row gap-8 items-center">
            
            {/* Light Mode Blueprint SVG */}
            <div className="w-full md:w-1/2 shrink-0">
              <svg className="w-full h-44 mx-auto" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Grid Lines */}
                <g stroke="rgba(16, 185, 129, 0.05)" strokeWidth="0.5">
                  <line x1="10" y1="20" x2="190" y2="20" />
                  <line x1="10" y1="40" x2="190" y2="40" />
                  <line x1="10" y1="60" x2="190" y2="60" />
                  <line x1="10" y1="80" x2="190" y2="80" />
                  <line x1="10" y1="100" x2="190" y2="100" />
                  
                  <line x1="30" y1="10" x2="30" y2="110" />
                  <line x1="50" y1="10" x2="50" y2="110" />
                  <line x1="70" y1="10" x2="70" y2="110" />
                  <line x1="90" y1="10" x2="90" y2="110" />
                  <line x1="110" y1="10" x2="110" y2="110" />
                  <line x1="130" y1="10" x2="130" y2="110" />
                  <line x1="150" y1="10" x2="150" y2="110" />
                  <line x1="170" y1="10" x2="170" y2="110" />
                </g>

                {/* Blueprint border details */}
                <rect x="10" y="10" width="180" height="100" rx="8" stroke="rgba(16, 185, 129, 0.12)" strokeWidth="1" />
                
                {/* Technical guidelines */}
                <line x1="45" y1="48" x2="45" y2="95" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="0.75" strokeDasharray="3 3" />
                <line x1="155" y1="48" x2="155" y2="95" stroke="rgba(245, 158, 11, 0.2)" strokeWidth="0.75" strokeDasharray="3 3" />
                <path d="M45 80H155" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="0.75" />
                <text x="92" y="76" fill="rgba(245, 158, 11, 0.5)" fontFamily="monospace" fontSize="6">d = 110cm</text>

                {/* Chair blueprint drawing */}
                <line x1="78" y1="95" x2="88" y2="68" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="122" y1="95" x2="112" y2="68" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="90" y1="92" x2="95" y2="68" stroke="#047857" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                <line x1="110" y1="92" x2="105" y2="68" stroke="#047857" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                <line x1="83" y1="82" x2="117" y2="82" stroke="#10b981" strokeWidth="0.75" opacity="0.7" />
                <line x1="85" y1="75" x2="115" y2="75" stroke="#10b981" strokeWidth="0.75" opacity="0.7" />

                {/* Seat Base */}
                <path d="M72 63C72 63 87 67 100 67C113 67 128 63 128 63C132 63 132 58 128 53C124 48 119 46 100 46C81 46 76 48 72 53C68 58 68 63 72 63Z" fill="#f8fafc" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" />
                
                {/* Glitched Backrest */}
                <path d="M78 43C75 35 79 20 97 20C115 20 119 35 116 43" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2" className="animate-pulse" />
                
                <path d="M43 48H47M153 48H157" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="0.75" />
                <path d="M78 95H82M118 95H122" stroke="#10b981" strokeWidth="0.75" />

                {/* Technical text */}
                <text x="15" y="20" fill="rgba(16, 185, 129, 0.45)" fontFamily="monospace" fontSize="6">SCALE 1:20</text>
                <text x="15" y="103" fill="rgba(16, 185, 129, 0.45)" fontFamily="monospace" fontSize="6">DWG: RUNTIME_ERR_500</text>
                <text x="142" y="20" fill="rgba(239, 68, 68, 0.65)" fontFamily="monospace" fontSize="6" className="animate-pulse">⚠️ ALIGN_ERR</text>

                <circle cx="116" cy="20" r="2.5" fill="#ef4444" className="animate-ping" />
                <circle cx="116" cy="20" r="1.5" fill="#ef4444" />
              </svg>
            </div>

            {/* Error Message and Action buttons */}
            <div className="flex-1 space-y-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-100">
                Critical Exception
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                Runtime crash safely intercepted
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Spacio CRM caught an unexpected rendering error. The page state was isolated to prevent data corruption. You can safely retry or return to your dashboard.
              </p>
              
              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  onClick={() => reset()}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <a
                  href="/dashboard"
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span>Go to Dashboard</span>
                </a>
              </div>
            </div>

          </div>

          {/* Diagnostics Log Details */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                System Diagnostics
              </h3>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">
                Use the crash logs below to debug the runtime exception or report the error.
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-[10px] text-rose-600 break-all max-h-60 overflow-y-auto scrollbar-thin">
                <p className="font-bold mb-1 leading-none text-slate-400 text-[8px] uppercase tracking-widest">Stack Trace</p>
                {error?.message || "An unknown layout crash occurred. Please check your internet connection or session validity."}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold leading-normal pt-2 border-t border-slate-100">
              Session code: <code className="font-mono font-bold text-slate-500">{error?.digest || "N/A"}</code>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-200/60 py-6 text-center text-xs text-slate-400 font-bold">
          <div className="flex justify-center items-center gap-2">
            <span>Powered by</span>
            <img src="/spacio_logo.png" alt="Spacio Logo" className="h-4 object-contain inline-block opacity-65 hover:opacity-100 transition-opacity" />
            <span className="text-slate-500">Spacio CRM</span>
          </div>
        </footer>

      </main>

    </div>
  );
}
