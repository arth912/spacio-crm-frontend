"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import { useToast } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import { Bill, PAYMENT_PILL, downloadBillPdf, fmtDate, money } from "../../lib/billing";

const FILTERS = ["all", "draft", "generated"] as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function BillingPage() {
  const toast = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setBills(await api<Bill[]>("/bills"));
    } catch (e: any) {
      setError(e.message || "Couldn't load bills.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const pdf = async (b: Bill) => {
    setBusy(b.id);
    try { await downloadBillPdf(b); } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(null); }
  };

  const remove = async (b: Bill) => {
    if (!window.confirm(`Delete draft ${b.bill_number}? This can't be undone.`)) return;
    setBusy(b.id);
    try {
      await api(`/bills/${b.id}`, { method: "DELETE" });
      setBills((bs) => bs.filter((x) => x.id !== b.id));
      toast.show("Draft deleted", "success");
    } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(null); }
  };

  const actionCls = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
  const columns: Column<Bill>[] = [
    { key: "no", label: "Bill", primary: true, sortValue: (r) => r.bill_date + r.bill_number, render: (r) => (
      <div><p className="font-bold text-slate-800 whitespace-nowrap">{r.bill_number}</p><p className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(r.bill_date)}</p></div>
    ) },
    { key: "client", label: "Customer and project", sortValue: (r) => (r.client_name || "").toLowerCase(), render: (r) => (
      <div className="min-w-0"><p className="font-semibold text-slate-800 truncate">{r.client_name}</p><p className="text-xs text-slate-400 truncate">{r.project_name}</p></div>
    ) },
    { key: "status", label: "Status", sortValue: (r) => r.status, render: (r) => (
      <span className="inline-flex flex-wrap gap-1.5">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${r.status === "draft" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>{cap(r.status)}</span>
        {r.status === "generated" && <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${PAYMENT_PILL[r.payment_status]}`}>{cap(r.payment_status)}</span>}
      </span>
    ) },
    { key: "total", label: "Total", align: "right", sortValue: (r) => r.grand_total, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{money(r.grand_total)}</span> },
    { key: "balance", label: "Balance", align: "right", sortValue: (r) => r.balance, render: (r) => (
      <span className="tabular-nums text-slate-600">{r.status === "generated" ? money(r.balance) : "—"}</span>
    ) },
    { key: "actions", label: "Actions", align: "right", render: (r) => (
      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Link href={`/billing/${r.id}`} className={actionCls}><ExternalLink className="w-3.5 h-3.5" />{r.status === "draft" ? "Edit" : "Open"}</Link>
        <button onClick={() => pdf(r)} disabled={busy === r.id} className={actionCls} aria-label={`Download PDF for ${r.bill_number}`}>
          {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}PDF
        </button>
        {r.status === "draft" && (
          <button onClick={() => remove(r)} disabled={busy === r.id} className={`${actionCls} text-rose-600`} aria-label={`Delete ${r.bill_number}`}><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Billing</h1>
            <p className="text-slate-500 mt-1 text-sm">Bills you have drafted or generated, and how much of each is paid.</p>
          </div>
          <Link href="/billing/new" className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 h-11 rounded-xl shadow-md text-sm">
            <Plus className="w-4 h-4" />New billing
          </Link>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}<button onClick={load} className="font-bold underline">Retry</button>
          </div>
        )}

        <DataTable
          rows={bills}
          columns={columns}
          rowKey={(r) => r.id}
          searchText={(r) => `${r.bill_number} ${r.client_name || ""} ${r.project_name || ""} ${r.status} ${r.payment_status}`}
          searchPlaceholder="Search by number, customer or project"
          defaultSort="no"
          loading={loading}
          filter={(r) => filter === "all" || r.status === filter}
          filterKey={filter}
          emptyText="No bills yet. Create your first one with + New."
          toolbar={
            <select value={filter} onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])} aria-label="Filter by status"
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700">
              {FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "Status: All" : `Status: ${cap(f)}`}</option>)}
            </select>
          }
        />
      </main>
    </div>
  );
}
