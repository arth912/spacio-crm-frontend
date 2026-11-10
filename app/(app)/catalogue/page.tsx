"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Globe } from "lucide-react";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import { api, inr, PRICING_LABEL } from "../../lib/api";
import ItemForm, { Category, Item } from "../../components/ItemForm";
import { TOUR_ACTION_EVENT } from "../../components/tour/events";

export default function CataloguePage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");
  const [editor, setEditor] = useState<{ item?: Item; rateOnly?: boolean } | null>(null);
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

  // The onboarding tour opens and closes the Add item form so it can point at the real fields.
  useEffect(() => {
    const onAction = (e: Event) => {
      const t = (e as CustomEvent<{ type: string; open: boolean }>).detail;
      if (t?.type === "item-form") setEditor(t.open ? {} : null);
    };
    window.addEventListener(TOUR_ACTION_EVENT, onAction);
    return () => window.removeEventListener(TOUR_ACTION_EVENT, onAction);
  }, []);

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
          <p className="font-semibold text-slate-800 truncate">{r.name}{r.is_general && <Globe aria-label="General catalogue item" className="inline w-3 h-3 ml-1.5 text-slate-400" />}</p>
          <p className="text-xs text-slate-400 truncate">{catName[r.category_id] || "Uncategorised"}{r.subcategory ? ` / ${r.subcategory}` : ""}{r.brand ? ` / ${r.brand}` : ""}</p>
        </div>
      ),
    },
    { key: "pricing", label: "Pricing", sortValue: (r) => r.pricing_type, render: (r) => <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{PRICING_LABEL[r.pricing_type] || r.pricing_type}</span> },
    { key: "base", label: "Base rate", align: "right", sortValue: (r) => r.base_rate, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{inr(r.base_rate)}{r.has_custom_rate && <span className="ml-1 text-[10px] font-bold text-amber-700">MINE</span>}</span> },
    { key: "labour", label: "Labour", align: "right", sortValue: (r) => r.labor_cost, render: (r) => <span className="text-slate-600 tabular-nums">{inr(r.labor_cost)}</span> },
    {
      key: "actions", label: "Actions", align: "right",
      render: (r) => (
        <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditor({ item: r, rateOnly: !!r.is_general })} aria-label={r.is_general ? `Set my rate for ${r.name}` : `Edit ${r.name}`} title={r.is_general ? "Set my rate" : "Edit"} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-700"><Pencil className="w-3.5 h-3.5" /></button>
          {!r.is_general && <button onClick={() => setConfirmDelete(r)} aria-label={`Delete ${r.name}`} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>}
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
          <button data-tour="catalogue-add" onClick={() => setEditor({})} className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm">
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
          rateOnly={editor.rateOnly}
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
