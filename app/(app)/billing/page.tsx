import { Receipt } from "lucide-react";
import TopBar from "../../components/TopBar";

export default function BillingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="flex-1 flex px-4 md:px-10 py-8 max-w-7xl w-full mx-auto">
        <div className="flex-1 min-h-[60vh] bg-white border border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center px-6 py-12">
          <div className="w-[76px] h-[76px] rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
            <Receipt className="w-9 h-9" />
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">Billing</span>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight">Coming soon</h1>
          <p className="mt-2 max-w-md text-slate-500">Invoices, payment tracking and receipts will live here. We are building it now.</p>
        </div>
      </main>
    </div>
  );
}
