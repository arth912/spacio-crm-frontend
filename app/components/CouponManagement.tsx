"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "./ToastProvider";
import { api, ApiError } from "../lib/api";

interface Coupon {
  code: string;
  discount_percent: number;
  free_days: number | null;
  valid_from: string | null;
  valid_until: string | null;
  max_redemptions: number | null;
  redeemed_count: number;
  is_active: boolean;
}

interface FormState {
  code: string;
  kind: "free" | "discount";
  discount_percent: string;
  free_days: string;
  valid_from: string;
  valid_until: string;
  max_redemptions: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  code: "", kind: "free", discount_percent: "20", free_days: "60",
  valid_from: "", valid_until: "", max_redemptions: "", is_active: true,
};

// API timestamps are naive UTC; <input type="date"> works with plain YYYY-MM-DD.
const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const show = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function statusOf(c: Coupon): { label: string; cls: string } {
  const now = Date.now();
  if (!c.is_active) return { label: "Inactive", cls: "bg-slate-100 text-slate-600" };
  if (c.valid_until && now > new Date(c.valid_until).getTime()) return { label: "Expired", cls: "bg-rose-50 text-rose-700" };
  if (c.valid_from && now < new Date(c.valid_from).getTime()) return { label: "Scheduled", cls: "bg-amber-50 text-amber-700" };
  if (c.max_redemptions != null && c.redeemed_count >= c.max_redemptions) return { label: "Used up", cls: "bg-slate-100 text-slate-600" };
  return { label: "Active", cls: "bg-emerald-50 text-emerald-700" };
}

export default function CouponManagement() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // code being edited, "" = new
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCoupons(await api<Coupon[]>("/admin/coupons"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(EMPTY); setFormError(""); setEditing(""); };
  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      kind: c.discount_percent >= 100 ? "free" : "discount",
      discount_percent: String(c.discount_percent >= 100 ? 20 : c.discount_percent),
      free_days: c.free_days ? String(c.free_days) : "",
      valid_from: toDate(c.valid_from),
      valid_until: toDate(c.valid_until),
      max_redemptions: c.max_redemptions != null ? String(c.max_redemptions) : "",
      is_active: c.is_active,
    });
    setFormError("");
    setEditing(c.code);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.valid_until) return setFormError("Choose the date until which this coupon is valid.");
    const free = form.kind === "free";
    if (free && !form.free_days) return setFormError("Enter the number of free subscription days.");
    const body = {
      code: form.code.trim(),
      discount_percent: free ? 100 : Number(form.discount_percent),
      free_days: form.free_days ? Number(form.free_days) : null,
      valid_from: form.valid_from ? `${form.valid_from}T00:00:00` : null,
      valid_until: `${form.valid_until}T23:59:59`, // valid through the whole end date
      max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (editing) await api(`/admin/coupons/${encodeURIComponent(editing)}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/admin/coupons", { method: "POST", body: JSON.stringify(body) });
      toast.show(editing ? "Coupon updated" : "Coupon created", "success");
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save the coupon.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api(`/admin/coupons/${encodeURIComponent(toDelete.code)}`, { method: "DELETE" });
      toast.show("Coupon deleted", "success");
      setToDelete(null);
      load();
    } catch (err) {
      setToDelete(null);
      setError(err instanceof ApiError ? err.message : "Could not delete the coupon.");
    }
  };

  const input = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30";
  const label = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1";

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">Free-access or discount codes shown to users after email verification and when a subscription expires.</p>
        <button onClick={openNew} className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-2 rounded-xl">
          <Plus className="w-4 h-4" /> New coupon
        </button>
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-3">Code</th><th className="px-4 py-3">Benefit</th><th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Valid</th><th className="px-4 py-3">Used</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No coupons yet.</td></tr>
            ) : coupons.map((c) => {
              const st = statusOf(c);
              return (
                <tr key={c.code} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.code}</td>
                  <td className="px-4 py-3">{c.discount_percent >= 100 ? "100% off (free)" : `${c.discount_percent}% off`}</td>
                  <td className="px-4 py-3">{c.free_days ? `${c.free_days} days` : "Plan length"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{show(c.valid_from)} → {show(c.valid_until)}</td>
                  <td className="px-4 py-3 tabular-nums">{c.redeemed_count}{c.max_redemptions != null ? ` / ${c.max_redemptions}` : ""}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${st.cls}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button aria-label={`Edit ${c.code}`} onClick={() => openEdit(c)} className="p-2 text-slate-500 hover:text-amber-700"><Pencil className="w-4 h-4" /></button>
                    <button aria-label={`Delete ${c.code}`} onClick={() => setToDelete(c)} className="p-2 text-slate-500 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-extrabold text-slate-900">{editing ? `Edit ${editing}` : "New coupon"}</h2>
            {formError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{formError}</div>}

            <div>
              <label className={label}>Code</label>
              <input className={`${input} uppercase font-mono`} value={form.code} disabled={!!editing} maxLength={50} required
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SPACEIO60" />
            </div>

            <div>
              <label className={label}>Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(["free", "discount"] as const).map((k) => (
                  <button type="button" key={k} onClick={() => setForm({ ...form, kind: k, free_days: k === "free" && !form.free_days ? "60" : form.free_days })}
                    className={`px-3 py-2 rounded-xl border text-sm font-bold ${form.kind === k ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600"}`}>
                    {k === "free" ? "Free access (100%)" : "Price discount"}
                  </button>
                ))}
              </div>
            </div>

            {form.kind === "discount" && (
              <div>
                <label className={label}>Discount % (1–99)</label>
                <input className={input} type="number" min={1} max={99} required value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              </div>
            )}

            <div>
              <label className={label}>Subscription days {form.kind === "discount" && "(blank = plan length)"}</label>
              <input className={input} type="number" min={1} max={3650} value={form.free_days} required={form.kind === "free"}
                onChange={(e) => setForm({ ...form, free_days: e.target.value })} placeholder="e.g. 60" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Valid from (optional)</label>
                <input className={input} type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <label className={label}>Valid until</label>
                <input className={input} type="date" required value={form.valid_until} min={form.valid_from || undefined}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>

            <div>
              <label className={label}>Max redemptions (blank = unlimited)</label>
              <input className={input} type="number" min={1} value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" disabled={saving} onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setToDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} role="alertdialog" className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-extrabold text-slate-900">Delete {toDelete.code}?</h2>
            <p className="text-sm text-slate-500">This can't be undone. Coupons that were already used can only be deactivated.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setToDelete(null)} className="px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={remove} className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
