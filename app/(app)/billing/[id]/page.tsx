"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TopBar from "../../../components/TopBar";
import BillForm from "../../../components/BillForm";
import { api } from "../../../lib/api";
import { Bill } from "../../../lib/billing";

export default function BillPage({ params }: { params: { id: string } }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Bill>(`/bills/${encodeURIComponent(params.id)}`).then(setBill).catch((e) => setError(e.message || "Couldn't load this bill."));
  }, [params.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <Link href="/billing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-4 h-4" />Billing
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{bill ? bill.bill_number : "Bill"}</h1>
        <p className="text-slate-500 mt-1 mb-6 text-sm">{bill?.status === "generated" ? "Generated bill" : "Draft bill"}</p>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {!bill && !error && <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" aria-label="Loading bill" />}
        {bill && <BillForm initial={bill} />}
      </main>
    </div>
  );
}
