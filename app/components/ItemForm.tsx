"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { api, inr, PRICING_LABEL } from "../lib/api";

export interface Category { id: string; name: string; is_general?: boolean }
export interface Item {
  id: string; category_id: string; subcategory: string; name: string; pricing_type: string;
  brand: string; base_rate: number; labor_cost: number; material?: string | null; dimensions?: string | null;
  is_general?: boolean; has_custom_rate?: boolean;
}

export default function ItemForm({ item, cats, defaultCat, onClose, onSaved, basePath = "/catalog", rateOnly = false }: { item?: Item; cats: Category[]; defaultCat?: string; onClose: () => void; onSaved: () => void; basePath?: string; rateOnly?: boolean }) {
  const [v, setV] = useState({
    name: item?.name || "", category_id: item?.category_id || defaultCat || "", subcategory: item?.subcategory || "",
    brand: item?.brand || "", pricing_type: item?.pricing_type || "sq_ft", base_rate: String(item?.base_rate ?? ""), labor_cost: String(item?.labor_cost ?? "0"),
  });
  const [margin, setMargin] = useState("20");
  const [gst, setGst] = useState("18");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const price = ((+v.base_rate || 0) + (+v.labor_cost || 0)) * (1 + (+margin || 0) / 100) * (1 + (+gst || 0) / 100);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return setErr("Enter an item name.");
    if (!v.category_id) return setErr("Choose a category.");
    if (v.base_rate === "" || +v.base_rate < 0) return setErr("Enter a base rate.");
    setSaving(true);
    setErr("");
    if (rateOnly && item) {
      try {
        await api(`/catalog/items/${item.id}/my-rate`, { method: "PUT", body: JSON.stringify({ base_rate: +v.base_rate, labor_cost: +v.labor_cost || 0 }) });
        onSaved();
      } catch (e: any) { setErr(e.message); setSaving(false); }
      return;
    }
    const body = JSON.stringify({
      name: v.name.trim(), category_id: v.category_id, subcategory: v.subcategory.trim() || "General", brand: v.brand.trim() || "Generic",
      pricing_type: v.pricing_type, base_rate: +v.base_rate, labor_cost: +v.labor_cost || 0,
    });
    try {
      if (item) await api(`${basePath}/items/${item.id}`, { method: "PUT", body });
      else await api(`${basePath}/items`, { method: "POST", body });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const field = "w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white";
  return (
    <div className="fixed inset-0 z-[80] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form data-tour="item-form" onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">{rateOnly ? "Set my rate" : item ? "Edit item" : "New catalogue item"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-xs font-bold text-slate-500">Item name<input className={field} type="text" disabled={rateOnly} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500">Category
            <select className={field} disabled={rateOnly} value={v.category_id} onChange={(e) => setV({ ...v, category_id: e.target.value })}>
              {cats.length === 0 && <option value="">No categories yet</option>}
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">Subcategory<input className={field} type="text" disabled={rateOnly} value={v.subcategory} onChange={(e) => setV({ ...v, subcategory: e.target.value })} placeholder="General" /></label>
        </div>
        <label className="block text-xs font-bold text-slate-500">Brand<input className={field} type="text" disabled={rateOnly} value={v.brand} onChange={(e) => setV({ ...v, brand: e.target.value })} placeholder="Generic" /></label>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">Pricing type</p>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="group" aria-label="Pricing type">
            {Object.entries(PRICING_LABEL).map(([k, l]) => (
              <button type="button" disabled={rateOnly} key={k} aria-pressed={v.pricing_type === k} onClick={() => setV({ ...v, pricing_type: k })}
                className={`py-2 rounded-lg text-xs font-bold ${v.pricing_type === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500">Base rate<input className={field} type="number" min="0" value={v.base_rate} onChange={(e) => setV({ ...v, base_rate: e.target.value })} /></label>
          <label className="block text-xs font-bold text-slate-500">Labour<input className={field} type="number" min="0" value={v.labor_cost} onChange={(e) => setV({ ...v, labor_cost: e.target.value })} /></label>
          <label className="block text-xs font-bold text-slate-500">Margin % (preview)<input className={field} type="number" min="0" value={margin} onChange={(e) => setMargin(e.target.value)} /></label>
          <label className="block text-xs font-bold text-slate-500">GST % (preview)<input className={field} type="number" min="0" value={gst} onChange={(e) => setGst(e.target.value)} /></label>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-amber-100 text-amber-800 px-4 py-3 text-sm font-semibold">
          <span>Client price per {PRICING_LABEL[v.pricing_type]}</span>
          <span className="text-xl font-extrabold tabular-nums">{inr(price)}</span>
        </div>
        {rateOnly && <p className="text-xs text-slate-500">This is a general catalogue item. Your rate is private to you and is used in your quotations.</p>}
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        <div className="flex gap-2">
          <button data-tour="item-save" type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save item
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
