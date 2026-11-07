import React from "react";

/** Base shimmering block. Size/shape come from className. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function SkeletonNav({ maxWidth = "max-w-7xl" }: { maxWidth?: string }) {
  return (
    <div className="border-b border-slate-200/60 px-4 py-4 md:px-10 bg-white/70">
      <div className={`flex justify-between items-center ${maxWidth} mx-auto`}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={`h-3.5 ${c === 0 ? "w-32" : "w-20"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="w-full flex items-end gap-2 px-2" style={{ height }} aria-hidden="true">
      {[40, 65, 50, 80, 55, 90, 70, 60, 85, 45].map((h, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-t-md bg-slate-200/70" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Generic page-level skeleton: nav + title + stat cards + list. Used by loading.tsx files. */
export function PageSkeleton({ stats = true, maxWidth = "max-w-7xl" }: { stats?: boolean; maxWidth?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20" role="status" aria-label="Loading">
      <SkeletonNav maxWidth={maxWidth} />
      <div className={`${maxWidth} mx-auto px-4 md:px-10 py-6 md:py-10 space-y-6`}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        {stats && <StatCardsSkeleton />}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-6">
          <CardListSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20" role="status" aria-label="Loading dashboard">
      <SkeletonNav />
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>
        <StatCardsSkeleton />
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <Skeleton className="h-4 w-40" />
            <ChartSkeleton />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            <ChartSkeleton height={220} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <Skeleton className="h-4 w-36 mb-4" />
          <table className="w-full"><tbody><TableRowsSkeleton rows={5} cols={5} /></tbody></table>
        </div>
      </div>
    </div>
  );
}
