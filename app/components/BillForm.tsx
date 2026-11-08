"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, Lock, Plus, Receipt, Save, Trash2 } from "lucide-react";
import { useToast } from "./ToastProvider";
import { TemplatePreview } from "./BillingTemplatePicker";
import { api, readStoredUser } from "../lib/api";
import {
  Bill, BillPayload, MAX_BILL_ITEMS, PAYMENT_PILL, PRICING_OPTIONS, PricingType, TemplateId, calcTotals, downloadBillPdf, fmtDate, money, templateName, todayIso,
} from "../lib/billing";

interface Client { id: string; name: string; phone: string; email?: string | null }
interface Project { id: string; client_id: string; name: string }
interface Payment { id: string; amount: number; payment_date: string; payment_method: string; transaction_id?: string | null }
interface CatalogItem { id: string; name: string; brand?: string | null; pricing_type: string; base_rate: number; labor_cost?: number | null }
interface Row {
  key: number; description: string; pricing: PricingType; length: string; breadth: string; height: string;
  qty: string; rate: string; tax: string; remark: string;
}

const input = "w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 disabled:bg-slate-50 disabled:text-slate-500";
const label = "block text-[13px] font-semibold text-slate-700 mb-1.5";
const card = "bg-white border border-slate-200 rounded-2xl p-4 sm:p-6";
const btn = "inline-flex items-center justify-center gap-2 h-12 lg:h-11 px-5 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors";
const btnPrimary = `${btn} bg-stone-900 hover:bg-stone-800 text-white`;
const btnSecondary = `${btn} bg-white border border-slate-300 text-slate-800 hover:bg-slate-50`;
const MEASURE = /^\d*\.?\d{0,2}$/;
const isPricing = (v: string): v is PricingType => PRICING_OPTIONS.some((p) => p.id === v);

let rowKey = 1;
const blankRow = (): Row => ({
  key: rowKey++, description: "", pricing: "piece", length: "1", breadth: "1", height: "1", qty: "1", rate: "", tax: "18", remark: "",
});
const toRows = (bill?: Bill): Row[] =>
  bill?.items.length
    ? bill.items.map((i) => ({
        key: rowKey++, description: i.description, pricing: i.pricing_type ?? "piece",
        length: String(i.length ?? 1), breadth: String(i.breadth ?? 1), height: String(i.height ?? 1),
        qty: String(i.qty), rate: String(i.rate), tax: String(i.tax_percent), remark: i.remark ?? "",
      }))
    : [blankRow()];

export default function BillForm({ initial }: { initial?: Bill }) {
  const router = useRouter();
  const toast = useToast();
  const locked = initial?.status === "generated";

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const [clientId, setClientId] = useState(initial?.client_id ?? "");
  const [projectId, setProjectId] = useState(initial?.project_id ?? "");
  const [billDate, setBillDate] = useState(initial?.bill_date ?? todayIso());
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [gstin, setGstin] = useState(initial?.customer_gstin ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [discount, setDiscount] = useState(initial?.discount_amount ? String(initial.discount_amount) : "");
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));

  const [busy, setBusy] = useState<"save" | "generate" | "pdf" | null>(null);
  /** Validation and server problems go to a toast: the first problem, plus how many more there are. */
  const fail = useCallback((problems: string[]) => {
    if (problems.length) toast.show(problems[0] + (problems.length > 1 ? ` (+${problems.length - 1} more)` : ""), "error");
  }, [toast]);
  const lastRowRef = useRef<HTMLInputElement>(null);
  const addedRow = useRef(false);

  const templateId = (initial?.template ?? readStoredUser()?.billing_template ?? "modern") as TemplateId;

  useEffect(() => {
    let alive = true;
    Promise.all([api<Client[]>("/clients"), api<Project[]>("/projects")])
      .then(([c, p]) => { if (alive) { setClients(c); setProjects(p); } })
      .catch((e) => alive && fail([e.message || "Could not load clients."]))
      .finally(() => alive && setLoadingRefs(false));
    if (!locked) api<CatalogItem[]>("/items").then((c) => alive && setCatalog(c)).catch(() => {});
    if (locked && initial) api<Payment[]>(`/bills/${initial.id}/payments`).then((p) => alive && setPayments(p)).catch(() => {});
    return () => { alive = false; };
  }, [locked, initial]);

  useEffect(() => {
    if (addedRow.current) { addedRow.current = false; lastRowRef.current?.focus(); }
  }, [rows.length]);

  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);
  const totals = useMemo(
    () => calcTotals(rows.map((r) => ({
      qty: Number(r.qty), rate: Number(r.rate), tax_percent: Number(r.tax),
      pricing_type: r.pricing, length: Number(r.length), breadth: Number(r.breadth), height: Number(r.height),
    })), Number(discount)),
    [rows, discount],
  );

  const patchRow = useCallback((key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r))), []);
  /** Typing a catalogue item's exact name fills its pricing type and rate, like picking it in an estimation. */
  const setName = (key: number, name: string) => {
    const hit = catalog.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setRows((rs) => rs.map((r) => {
      if (r.key !== key) return r;
      if (!hit) return { ...r, description: name };
      return {
        ...r, description: name,
        pricing: isPricing(hit.pricing_type) ? hit.pricing_type : r.pricing,
        rate: r.rate === "" ? String((hit.base_rate || 0) + (hit.labor_cost || 0)) : r.rate,
      };
    }));
  };
  const addRow = () => { addedRow.current = true; setRows((rs) => (rs.length < MAX_BILL_ITEMS ? [...rs, blankRow()] : rs)); };
  const removeRow = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const validate = (): string[] => {
    const e: string[] = [];
    if (!clientId) e.push("Choose a client.");
    if (!projectId) e.push("Choose a project for this bill.");
    if (!billDate) e.push("Add the bill date.");
    if (dueDate && dueDate < billDate) e.push("The due date can't be before the bill date.");
    rows.forEach((r, i) => {
      if (!r.description.trim()) e.push(`Item ${i + 1}: add an item name.`);
      if (r.pricing !== "piece" && !(Number(r.length) > 0)) e.push(`Item ${i + 1}: length must be more than 0.`);
      if (!(Number(r.qty) > 0)) e.push(`Item ${i + 1}: quantity must be more than 0.`);
      if (r.rate === "" || Number(r.rate) < 0) e.push(`Item ${i + 1}: add a rate.`);
      if (Number(r.tax) < 0 || Number(r.tax) > 100) e.push(`Item ${i + 1}: tax must be between 0 and 100.`);
    });
    if (totals.discountTooHigh) e.push("The discount can't be more than the bill total.");
    return e;
  };

  const payload = (): BillPayload => ({
    client_id: clientId, project_id: projectId, bill_date: billDate, due_date: dueDate || null,
    customer_gstin: gstin.trim() || null, notes: notes.trim() || null, discount_amount: Number(discount) || 0,
    items: rows.map((r) => ({
      description: r.description.trim(), qty: Number(r.qty), rate: Number(r.rate), tax_percent: Number(r.tax) || 0,
      pricing_type: r.pricing, length: Number(r.length) || 0, breadth: Number(r.breadth) || 0, height: Number(r.height) || 0,
      remark: r.remark.trim() || null,
    })),
  });

  const persist = async (): Promise<Bill | null> => {
    const problems = validate();
    if (problems.length) { fail(problems); return null; }
    return initial
      ? api<Bill>(`/bills/${initial.id}`, { method: "PUT", body: JSON.stringify(payload()) })
      : api<Bill>("/bills", { method: "POST", body: JSON.stringify(payload()) });
  };

  const save = async () => {
    setBusy("save");
    try {
      const bill = await persist();
      if (!bill) return;
      toast.show(`${bill.bill_number} saved as a draft`, "success");
      router.push("/billing");
    } catch (e: any) { fail([e.message || "Could not save the bill."]); }
    finally { setBusy(null); }
  };

  const generate = async () => {
    setBusy("generate");
    try {
      const saved = await persist();
      if (!saved) return;
      const bill = await api<Bill>(`/bills/${saved.id}/generate`, { method: "POST" });
      toast.show(`${bill.bill_number} generated`, "success");
      downloadBillPdf(bill).catch(() => toast.show("Bill generated, but the PDF download failed. Download it from the Billing list.", "error"));
      router.push("/billing");
    } catch (e: any) { fail([e.message || "Could not generate the bill."]); }
    finally { setBusy(null); }
  };

  const pdf = async () => {
    if (!initial) return;
    setBusy("pdf");
    try { await downloadBillPdf(initial); } catch (e: any) { toast.show(e.message, "error"); } finally { setBusy(null); }
  };

  const renderActions = (className: string) =>
    locked ? (
      <div className={className}>
        <button type="button" className={`${btnPrimary} col-span-full`} onClick={pdf} disabled={busy !== null}>
          {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Download PDF
        </button>
      </div>
    ) : (
      <div className={className}>
        <button type="button" className={btnSecondary} onClick={save} disabled={busy !== null}>
          {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save Bill
        </button>
        <button type="button" className={btnPrimary} onClick={generate} disabled={busy !== null}>
          {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}Generate Bill
        </button>
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 lg:gap-6 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        {locked && (
          <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900">
            <Lock className="w-4 h-4 shrink-0" />This bill has been generated, so it can no longer be edited.
          </div>
        )}

        <section className={card} aria-labelledby="cust-h">
          <h2 id="cust-h" className="text-base font-extrabold text-slate-900 mb-4">Customer details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-client" className={label}>Client</label>
              <select id="bill-client" className={input} value={clientId} disabled={locked || loadingRefs}
                onChange={(e) => { setClientId(e.target.value); setProjectId(""); }}>
                <option value="">{loadingRefs ? "Loading..." : "Select a client"}</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="bill-project" className={label}>Project</label>
              <select id="bill-project" className={input} value={projectId} disabled={locked || !clientId}
                onChange={(e) => setProjectId(e.target.value)}>
                <option value="">{clientId ? (clientProjects.length ? "Select a project" : "This client has no projects") : "Pick a client first"}</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bill-gstin" className={label}>Customer GSTIN (optional)</label>
              <input id="bill-gstin" className={input} value={gstin} maxLength={20} disabled={locked} placeholder="22AAAAA0000A1Z5"
                onChange={(e) => setGstin(e.target.value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase())} />
            </div>
          </div>
        </section>

        <section className={card} aria-labelledby="det-h">
          <h2 id="det-h" className="text-base font-extrabold text-slate-900 mb-4">Bill details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={label}>Bill number</label>
              <input className={`${input} bg-slate-50 text-slate-500`} readOnly value={initial?.bill_number ?? "Assigned when saved"} aria-readonly="true" />
            </div>
            <div>
              <label htmlFor="bill-date" className={label}>Bill date</label>
              <input id="bill-date" type="date" className={input} value={billDate} disabled={locked} onChange={(e) => setBillDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="bill-due" className={label}>Due date</label>
              <input id="bill-due" type="date" className={input} value={dueDate} min={billDate} disabled={locked} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </section>

        <section className={card} aria-labelledby="items-h">
          <h2 id="items-h" className="text-base font-extrabold text-slate-900">Billing items</h2>
          <p className="text-[13px] text-slate-500 mt-0.5 mb-4">Name each item and bill it per piece, per sq ft or per running ft, as in estimations</p>
          <datalist id="bill-catalog">{catalog.map((c) => <option key={c.id} value={c.name} />)}</datalist>
          <div className="flex flex-col gap-3">
            {rows.map((r, i) => {
              const unit = PRICING_OPTIONS.find((p) => p.id === r.pricing)!.unit;
              const dim = (k: "length" | "breadth" | "height", l: string) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor={`${k}${r.key}`}>{l}</label>
                  <input id={`${k}${r.key}`} className={input} inputMode="decimal" value={r[k]} disabled={locked}
                    onChange={(e) => MEASURE.test(e.target.value) && patchRow(r.key, { [k]: e.target.value })} />
                </div>
              );
              return (
                <div key={r.key} className="rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_170px_auto] gap-x-3 gap-y-3 items-end">
                    <span className="text-sm font-bold text-slate-500 h-11 flex items-center">{i + 1}</span>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor={`d${r.key}`}>Item name</label>
                      <input id={`d${r.key}`} ref={i === rows.length - 1 ? lastRowRef : undefined} className={input} value={r.description}
                        maxLength={200} disabled={locked} list="bill-catalog" onChange={(e) => setName(r.key, e.target.value)} />
                    </div>
                    <div className="col-start-2 sm:col-start-auto">
                      <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor={`p${r.key}`}>Pricing</label>
                      <select id={`p${r.key}`} className={input} value={r.pricing} disabled={locked}
                        onChange={(e) => isPricing(e.target.value) && patchRow(r.key, { pricing: e.target.value })}>
                        {PRICING_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    {!locked && (
                      <button type="button" onClick={() => removeRow(r.key)} disabled={rows.length === 1} aria-label={`Remove item ${i + 1}`}
                        className="w-11 h-11 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 flex items-center justify-center row-start-1 col-start-3 sm:col-start-4">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {r.pricing === "sq_ft" && <>{dim("length", "Length (ft)")}{dim("breadth", "Breadth (ft)")}{dim("height", "Height (ft)")}</>}
                    {r.pricing === "running_ft" && dim("length", "Length (ft)")}
                    {([["qty", "Qty", r.qty], ["rate", `Rate (₹ / ${unit})`, r.rate], ["tax", "Tax %", r.tax]] as const).map(([k, l, v]) => (
                      <div key={k}>
                        <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor={`${k}${r.key}`}>{l}</label>
                        <input id={`${k}${r.key}`} className={input} inputMode="decimal" value={v} disabled={locked}
                          onChange={(e) => MEASURE.test(e.target.value) && patchRow(r.key, { [k]: e.target.value })} />
                      </div>
                    ))}
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Amount (₹)</span>
                      <output className="h-11 flex items-center justify-end px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 tabular-nums">
                        {totals.amounts[i].toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </output>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1" htmlFor={`rm${r.key}`}>Remark (optional)</label>
                    <input id={`rm${r.key}`} className={input} value={r.remark} maxLength={500} disabled={locked}
                      placeholder="Specifications, material, finish…" onChange={(e) => patchRow(r.key, { remark: e.target.value })} />
                  </div>
                </div>
              );
            })}
          </div>
          {!locked && (
            <button type="button" onClick={addRow} disabled={rows.length >= MAX_BILL_ITEMS}
              className="mt-4 w-full h-12 lg:h-11 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-800 text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-100 disabled:opacity-50">
              <Plus className="w-4 h-4" />Add Item
            </button>
          )}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-discount" className={label}>Discount (₹)</label>
              <input id="bill-discount" className={input} inputMode="decimal" value={discount} disabled={locked} placeholder="0"
                onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setDiscount(e.target.value)} />
            </div>
            <div>
              <label htmlFor="bill-notes" className={label}>Overall remarks (optional)</label>
              <input id="bill-notes" className={input} value={notes} maxLength={2000} disabled={locked} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-5 min-w-0 lg:sticky lg:top-24">
        <section className={card}>
          <h2 className="text-base font-extrabold text-slate-900 mb-4">Billing template</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 shrink-0"><TemplatePreview id={templateId} /></div>
            <div>
              <p className="text-base font-extrabold text-slate-800">{templateName(templateId)}</p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Lock className="w-3 h-3" />Locked here</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            To change it, go to <Link href="/profile#billing" className="font-bold text-amber-700 hover:underline">My Profile → Billing template</Link>
          </p>
        </section>

        <section className={card} aria-labelledby="sum-h">
          <h2 id="sum-h" className="text-base font-extrabold text-slate-900 mb-4">Summary</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-semibold text-slate-800 tabular-nums">{money(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-semibold text-slate-800 tabular-nums">– {money(totals.discount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax (GST)</dt><dd className="font-semibold text-slate-800 tabular-nums">{money(totals.tax)}</dd></div>
            <div className="flex justify-between items-center border-t border-slate-200 pt-3"><dt className="font-extrabold text-slate-900">Total</dt><dd className="text-xl font-extrabold text-amber-700 tabular-nums">{money(totals.total)}</dd></div>
            {locked && initial && (
              <>
                <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-semibold text-slate-800 tabular-nums">{money(initial.paid_amount)}</dd></div>
                <div className="flex justify-between items-center"><dt className="text-slate-500">Balance</dt>
                  <dd className="flex items-center gap-2"><span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${PAYMENT_PILL[initial.payment_status]}`}>{initial.payment_status}</span><span className="font-extrabold text-slate-900 tabular-nums">{money(initial.balance)}</span></dd></div>
              </>
            )}
          </dl>
          {renderActions("hidden lg:grid grid-cols-1 gap-3 mt-5")}
          {!locked && <p className="hidden lg:block mt-3 text-xs text-slate-500">Saved bills stay as drafts until generated.</p>}
        </section>

        {locked && initial && (
          <section className={card}>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">Payments</h2>
            {payments.length === 0 ? <p className="text-sm text-slate-500">No payments recorded against this bill yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <li key={p.id} className="py-2 flex justify-between gap-3 text-sm">
                    <span className="text-slate-600">{fmtDate(p.payment_date.slice(0, 10))} · {p.payment_method}</span>
                    <span className="font-bold text-slate-800 tabular-nums">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            {initial.balance > 0 && (
              <Link href={`/clients/${initial.client_id}?bill=${initial.id}`} className="mt-4 inline-flex text-sm font-bold text-amber-700 hover:underline">Record a payment →</Link>
            )}
          </section>
        )}
      </aside>

      {renderActions("lg:hidden sticky bottom-0 z-10 -mx-4 md:-mx-10 px-4 md:px-10 py-3 bg-white border-t border-slate-200 grid grid-cols-2 gap-3")}
    </div>
  );
}
