"use client";

import React, { useState, useEffect } from "react";

interface SpaceLoaderProps {
  loading?: boolean;         // Control the transition from active loading to completed state
  fullPage?: boolean;        // Whether it is a full-screen overlay or inline
  text?: string;             // Text to show during loading
  size?: "sm" | "md" | "lg"; // Size for inline variant
  minDurationMs?: number;    // Minimum time to show the loader (default: 800ms)
}

export default function SpaceLoader({
  loading = true,
  fullPage = true,
  text,
  size = "md",
  minDurationMs = 800,
}: SpaceLoaderProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [stage, setStage] = useState<"loading" | "completed">("loading");
  const [mountedTime, setMountedTime] = useState(0);

  useEffect(() => {
    setMountedTime(Date.now());
  }, []);

  useEffect(() => {
    if (!fullPage) return;

    if (!loading) {
      const elapsed = Date.now() - mountedTime;
      const remainingTime = Math.max(0, minDurationMs - elapsed);

      const timer = setTimeout(() => {
        setStage("completed");
        
        // Let the fadeout transition complete before removing from DOM
        const endTimer = setTimeout(() => {
          setShouldRender(false);
        }, 500);

        return () => clearTimeout(endTimer);
      }, remainingTime);

      return () => clearTimeout(timer);
    } else {
      setStage("loading");
      setShouldRender(true);
    }
  }, [loading, mountedTime, minDurationMs, fullPage]);

  // Size mappings for inline loaders
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  if (!shouldRender && fullPage) return null;

  if (fullPage) {
    return (
      <div 
        className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white/70 backdrop-blur-md transition-all duration-500 ease-in-out ${
          stage === "completed" ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Isometric 3D Boxes Loader */}
        <div className="relative h-20 flex items-center justify-center mb-2">
          <div className="boxes">
            <div className="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <div className="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <div className="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <div className="box">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>

        {/* Isometric Green Reflection Grid */}
        <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2050/svg" className="opacity-25 -mt-3 mb-6 select-none pointer-events-none">
          <path d="M60 2 L85 14 L60 26 L35 14 Z" fill="url(#grid-grad)" opacity="0.35" />
          <path d="M35 14 L60 26 L35 38 L10 26 Z" fill="url(#grid-grad)" opacity="0.2" />
          <path d="M85 14 L110 26 L85 38 L60 26 Z" fill="url(#grid-grad)" opacity="0.2" />
          <defs>
            <linearGradient id="grid-grad" x1="60" y1="2" x2="60" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8ebb96" />
              <stop offset="1" stopColor="#30573e" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo Card */}
        <div className="w-14 h-14 bg-white rounded-xl shadow-md border border-slate-100/90 flex items-center justify-center p-2.5 mb-3 select-none pointer-events-none">
          <img 
            src="/spaceio_logo.png" 
            alt="SpaceIO Logo" 
            className="w-full h-full object-contain" 
          />
        </div>

        {/* Brand Text Details */}
        <div className="text-center z-10 flex flex-col items-center select-none pointer-events-none">
          <div className="text-base font-black text-slate-800 tracking-[0.25em] uppercase mb-1">
            SPACEIO
          </div>
          <div className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase mt-2 opacity-85">
            {text || "Assembling SpaceIO CRM..."}
          </div>
        </div>
      </div>
    );
  }

  // Inline spinner variant (perfect for buttons, compact grids) - Styled to match themed boxes
  return (
    <div className="inline-flex items-center justify-center select-none" role="status">
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Styled green revolving spinner */}
        <div className="absolute w-full h-full rounded-full border-2 border-slate-200 border-t-emerald-600 animate-spin" />
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      {text && <span className="ml-2 text-xs font-bold text-slate-500">{text}</span>}
    </div>
  );
}
