"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TopBar from "../../../components/TopBar";
import BillForm from "../../../components/BillForm";

export default function NewBillingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <Link href="/billing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-4 h-4" />Billing
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">New Billing</h1>
        <p className="text-slate-500 mt-1 mb-6 text-sm">Fill in the details and add billing items.</p>
        <BillForm />
      </main>
    </div>
  );
}
