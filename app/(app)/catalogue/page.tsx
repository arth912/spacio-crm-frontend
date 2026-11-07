"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import { api, inr, PRICING_LABEL } from "../../lib/api";

interface Category { id: string; name: string }
interface Item {
  id: string; category_id: string; subcategory: string; name: string; pricing_type: string;
  brand: string; base_rate: number; labor_cost: number; material?: string | null; dimensions?: string | null;
}

export default function CataloguePage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");
  const [editor, setEditor] = useState<{ item?: Item } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, i] = await Promise.all([api<Category[]>("/catalog/categories"), api<Item[]>("/catalog/items")]);
      setCats(c);
      setItems(i);
    } catch (e: any) {
      setError(e.message || "Couldn't load the catalogue.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const catName = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => { m[i.category_id] = (m[i.category_id] || 0) + 1; });
    return m;
  }, [items]);

  const columns: Column<Item>[] = [
    {
      key: "name", label: "Item", primary: true, sortValue: (r) => r.name.toLowerCase(),
      render: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{r.name}</p>
          <p className="text-xs text-slate-400 truncate">{catName[r.category_id] || "Uncategorised"}{r.subcategory ? ` / ${r.subcategory}` : ""}{r.brand ? ` / ${r.brand}` : ""}</p>
        </div>
      ),
    },
    { key: "pricing", label: "Pricing", sortValue: (r) => r.pricing_type, render: (r) => <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{PRICING_LABEL[r.pricing_type] || r.pricing_type}</span> },
    { key: "base", label: "Base rate", align: "right", sortValue: (r) => r.base_rate, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{inr(r.base_rate)}</span> },
    { key: "labour", label: "Labour", align: "right", sortValue: (r) => r.labor_cost, render: (r) => <span className="text-slate-600 tabular-nums">{inr(r.labor_cost)}</span> },
    {
      key: "actions", label: "Actions", align: "right",
      render: (r) => (
        <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditor({ item: r })} aria-label={`Edit ${r.name}`} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-700"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => setConfirmDelete(r)} aria-label={`Delete ${r.name}`} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];

  const addCategory = async () => {
    const name = (newCat || "").trim();
    if (!name) return setNewCat(null);
    try {
      const c = await api<Category>("/catalog/categories", { method: "POST", body: JSON.stringify({ name }) });
      await load();
      setCat(c.id);
    } catch (e: any) { setError(e.message); }
    setNewCat(null);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api(`/catalog/items/${confirmDelete.id}`, { method: "DELETE" });
      setConfirmDelete(null);
      await load();
    } catch (e: any) {
      setError(e.message);
      setConfirmDelete(null);
    }
  };

  const pill = (id: string, label: string, n: number) => (
    <button
      key={id}
      onClick={() => setCat(id)}
      aria-pressed={cat === id}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap ${cat === id ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {label}<span className="text-xs font-medium text-slate-400">{n}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Catalogue and rates</h1>
            <p className="text-slate-500 mt-1 text-sm">Set up the items you sell and the rate for each. Estimations pick from here.</p>
          </div>
          <button onClick={() => setEditor({})} className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm">
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button onClick={() => setError("")} className="font-bold underline">Dismiss</button>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)] items-start">
          <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex xl:flex-col gap-0.5 overflow-x-auto">
            {pill("all", "All items", items.length)}
            {cats.map((c) => pill(c.id, c.name, counts[c.id] || 0))}
            {newCat === null ? (
              <button onClick={() => setNewCat("")} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 text-left whitespace-nowrap hover:bg-amber-50">+ New category</button>
            ) : (
              <input
                autoFocus
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                onBlur={addCategory}
                onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setNewCat(null); }}
                placeholder="Category name"
                aria-label="New category name"
                className="px-3 py-2 rounded-xl border border-amber-400 text-sm bg-white min-w-[140px]"
              />
            )}
          </div>
          <DataTable
            rows={items}
            columns={columns}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.name} ${r.brand} ${r.subcategory} ${catName[r.category_id] || ""} ${PRICING_LABEL[r.pricing_type] || ""}`}
            searchPlaceholder="Search items, brand or category"
            defaultSort="name"
            loading={loading}
            filter={(r) => cat === "all" || r.category_id === cat}
            filterKey={cat}
            emptyText="No items here yet. Add an item to set its rate."
          />
        </div>
      </main>

      {editor && (
        <ItemForm
          item={editor.item}
          cats={cats}
          defaultCat={cat !== "all" ? cat : cats[0]?.id}
          onClose={() => setEditor(null)}
          onSaved={async () => { setEditor(null); await load(); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Delete item" className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-extrabold text-slate-900">Delete {confirmDelete.name}?</h2>
            <p className="text-sm text-slate-500">It will be removed from the catalogue. Items used in existing quotations can't be deleted.</p>
            <div className="flex gap-2">
              <button onClick={doDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">Delete item</button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemForm({ item, cats, defaultCat, onClose, onSaved }: { item?: Item; cats: Category[]; defaultCat?: string; onClose: () => void; onSaved: () => void }) {
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
    const body = JSON.stringify({
      name: v.name.trim(), category_id: v.category_id, subcategory: v.subcategory.trim() || "General", brand: v.brand.trim() || "Generic",
      pricing_type: v.pricing_type, base_rate: +v.base_rate, labor_cost: +v.labor_cost || 0,
    });
    try {
      if (item) await api(`/catalog/items/${item.id}`, { method: "PUT", body });
      else await api("/catalog/items", { method: "POST", body });
      onSaved();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const field = "w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white";
  return (
    <div className="fixed inset-0 z-[80] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">{item ? "Edit item" : "New catalogue item"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-xs font-bold text-slate-500">Item name<input className={field} type="text" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500">Category
            <select className={field} value={v.category_id} onChange={(e) => setV({ ...v, category_id: e.target.value })}>
              {cats.length === 0 && <option value="">No categories yet</option>}
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500">Subcategory<input className={field} type="text" value={v.subcategory} onChange={(e) => setV({ ...v, subcategory: e.target.value })} placeholder="General" /></label>
        </div>
        <label className="block text-xs font-bold text-slate-500">Brand<input className={field} type="text" value={v.brand} onChange={(e) => setV({ ...v, brand: e.target.value })} placeholder="Generic" /></label>
        <div>
          <p className="text-xs font-bold text-slate-500 mb-1.5">Pricing type</p>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl" role="group" aria-label="Pricing type">
            {Object.entries(PRICING_LABEL).map(([k, l]) => (
              <button type="button" key={k} aria-pressed={v.pricing_type === k} onClick={() => setV({ ...v, pricing_type: k })}
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
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save item
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
