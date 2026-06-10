'use client';

import React, { useEffect, useState } from 'react';
import { Home } from 'lucide-react';

export default function NotFound() {
  const [user, setUser] = useState<any>(null);
  const [path, setPath] = useState("");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("decocrm_user");
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
      setPath(window.location.pathname);
    } catch (e) {
      console.error(e);
    }
  }, []);

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
            Page Not Found 🔍
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">The room layout or project route you requested could not be located in our CRM directory.</p>
        </div>

        {/* Dashboard Grid Template */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Error Illustration and Action Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm col-span-1 lg:col-span-2 flex flex-col md:flex-row gap-8 items-center">
            
            {/* Light Mode Blueprint Doorway SVG */}
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

                {/* Isometric Doorframe sketch */}
                <path d="M85 90V40L125 25V75L85 90Z" fill="#f8fafc" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
                
                {/* Highlighted door frame */}
                <path d="M85 90V40L125 25" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M125 25V75" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />

                {/* The Swing Path */}
                <path d="M85 90A40 15 0 0 1 50 82" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Question mark inside empty doorway */}
                <path d="M101 43C101 40.5 103 38.5 106 38.5C109 38.5 111 40.5 111 43C111 45.5 109.5 46.5 108.5 47.5C107.5 48.5 107.5 50 107.5 51" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="107.5" cy="55" r="1" fill="#f59e0b" />

                {/* Compass / Protractor overlay */}
                <circle cx="160" cy="85" r="12" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1" strokeDasharray="1 2" />
                <line x1="160" y1="85" x2="168" y2="77" stroke="#10b981" strokeWidth="1.2" />
                <line x1="160" y1="85" x2="152" y2="93" stroke="#10b981" strokeWidth="1.2" />

                {/* Dimensions */}
                <text x="100" y="98" fill="rgba(245, 158, 11, 0.55)" fontFamily="monospace" fontSize="6">VOID: 404_PAGE</text>
                <text x="15" y="20" fill="rgba(16, 185, 129, 0.45)" fontFamily="monospace" fontSize="6">SCALE 1:50</text>
                <text x="15" y="103" fill="rgba(16, 185, 129, 0.45)" fontFamily="monospace" fontSize="6">DWG: OUT_OF_BOUNDS</text>

                <circle cx="125" cy="25" r="2.5" fill="#10b981" className="animate-ping" />
                <circle cx="125" cy="25" r="1.5" fill="#10b981" />
              </svg>
            </div>

            {/* Error Message and Action buttons */}
            <div className="flex-1 space-y-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-100">
                Route Missing
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                Outside Design Boundaries
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                The requested URL does not match any room configuration or layout views in your CRM. Double-check your URL, or use the link below to safely return home.
              </p>
              
              <div className="pt-2">
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Go to Dashboard</span>
                </a>
              </div>
            </div>

          </div>

          {/* Diagnostics Log Details */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Request Details
              </h3>
              <p className="text-[11px] text-slate-400 font-bold leading-normal">
                Review the path details that resulted in this routing mismatch.
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 font-mono text-[10px] text-slate-600 break-all max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block mb-0.5">Requested Path</span>
                    <span className="text-slate-800 font-semibold text-[11px]">{path || "/"}</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block mb-0.5">HTTP Status</span>
                    <span className="text-amber-700 font-bold text-[11px]">404 Not Found</span>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase tracking-widest text-slate-400 font-bold block mb-0.5">Router State</span>
                    <span className="text-emerald-700 font-bold text-[11px]">Unmapped Route</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold leading-normal pt-2 border-t border-slate-100">
              Ensure you have correct permissions for this page link.
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
