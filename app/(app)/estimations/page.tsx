"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Download, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import { api, inr, STATUS_PILL } from "../../lib/api";
import { API_BASE_URL, getToken } from "../../lib/session";

interface Quote {
  id: string; project_id: string; project_name?: string | null; client_name?: string | null;
  version: number; grand_total: number; status: string; created_at: string;
}

const STATUSES = ["all", "draft", "sent", "approved", "revised", "rejected"];
const label = (s: string) => s[0].toUpperCase() + s.slice(1);
const number = (q: Quote) => "EST-" + q.id.replace(/-/g, "").slice(0, 6).toUpperCase();

export default function EstimationsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setError("");
    try {
      setQuotes(await api<Quote[]>("/quotations"));
    } catch (e: any) {
      setError(e.message || "Couldn't load estimations.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    quotes.forEach((q) => { m[q.status] = (m[q.status] || 0) + 1; });
    return m;
  }, [quotes]);

  const downloadPdf = async (q: Quote) => {
    setBusy(q.id);
    const toastId = toast.show("Generating PDF...", "loading");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/quotations/${q.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("PDF failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(q.project_name || "estimation").replace(/\s+/g, "_")}_proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.update(toastId, "PDF downloaded", "success");
    } catch {
      toast.update(toastId, "PDF generation failed", "error");
      window.open(`/pdf/${q.id}`, "_blank");
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<Quote>[] = [
    { key: "no", label: "Number", primary: true, sortValue: (r) => r.created_at, render: (r) => (
      <div><p className="font-bold text-slate-800 whitespace-nowrap">{number(r)}</p><p className="text-xs text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
    ) },
    { key: "client", label: "Client and project", sortValue: (r) => (r.client_name || "").toLowerCase(), render: (r) => (
      <div className="min-w-0"><p className="font-semibold text-slate-800 truncate">{r.client_name || "Unknown client"}</p><p className="text-xs text-slate-400 truncate">{r.project_name || "Project"}</p></div>
    ) },
    { key: "version", label: "Version", sortValue: (r) => r.version, render: (r) => <span className="text-slate-600">v{r.version}</span> },
    { key: "status", label: "Status", sortValue: (r) => r.status, render: (r) => <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_PILL[r.status] || STATUS_PILL.draft}`}>{label(r.status)}</span> },
    { key: "total", label: "Grand total", align: "right", sortValue: (r) => r.grand_total, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{inr(r.grand_total)}</span> },
    { key: "actions", label: "Actions", align: "right", render: (r) => (
      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Link href={`/quotation-builder?edit=${r.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="w-3.5 h-3.5" />Open</Link>
        <button onClick={() => downloadPdf(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}PDF
        </button>
      </div>
    ) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Estimations</h1>
            <p className="text-slate-500 mt-1 text-sm">Every estimate you have made, with its status and total.</p>
          </div>
          <Link href="/quotation-builder" data-tour="estimate-new" className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm">
            <Plus className="w-4 h-4" /> New estimation
          </Link>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}<button onClick={load} className="font-bold underline">Retry</button>
          </div>
        )}

        <div data-tour="estimate-status" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {["draft", "sent", "approved", "rejected"].map((s) => (
            <button key={s} onClick={() => setStatus(status === s ? "all" : s)} aria-pressed={status === s}
              className={`text-left bg-white border rounded-2xl px-4 py-3 ${status === s ? "border-amber-400 ring-2 ring-amber-500/15" : "border-slate-200 hover:border-slate-300"}`}>
              <p className="text-xs text-slate-500">{label(s)}</p>
              <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{counts[s] || 0}</p>
            </button>
          ))}
        </div>

        <DataTable
          rows={quotes}
          columns={columns}
          rowKey={(r) => r.id}
          searchText={(r) => `${number(r)} ${r.client_name || ""} ${r.project_name || ""} ${r.status}`}
          searchPlaceholder="Search by number, client, project or status"
          defaultSort="no"
          loading={loading}
          filter={(r) => status === "all" || r.status === status}
          filterKey={status}
          emptyText="No estimations yet. Create your first one."
          toolbar={
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700">
              {STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "Status: All" : `Status: ${label(s)}`}</option>)}
            </select>
          }
        />
      </main>
    </div>
  );
}
