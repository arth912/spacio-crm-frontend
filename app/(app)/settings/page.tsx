"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import ItemForm, { Category, Item } from "../../components/ItemForm";
import { useToast } from "../../components/ToastProvider";
import UserManagement from "../../components/UserManagement";
import CouponManagement from "../../components/CouponManagement";
import { api, inr, readStoredUser, PRICING_LABEL } from "../../lib/api";

type Tab = "catalogue" | "users" | "coupons";
const TABS: { id: Tab; label: string }[] = [
  { id: "catalogue", label: "General catalogue" },
  { id: "users", label: "User management" },
  { id: "coupons", label: "Coupons" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("catalogue");

  useEffect(() => {
    const u = readStoredUser();
    if (!u) return router.push("/login?redirect=/settings");
    if (u.role !== "Admin") return router.push("/dashboard");
    if (new URLSearchParams(window.location.search).get("tab") === "users") setTab("users");
    setAllowed(true);
  }, [router]);

  if (!allowed) return null;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Admin controls for the whole workspace.</p>
        <div role="tablist" aria-label="Settings sections" className="mt-6 flex gap-6 border-b border-slate-200 overflow-x-auto overflow-y-hidden pb-px">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`py-3 text-sm whitespace-nowrap -mb-px border-b-2 ${tab === t.id ? "border-amber-600 text-amber-700 font-bold" : "border-transparent text-slate-500 font-semibold hover:text-slate-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === "catalogue" && <GeneralCatalogue />}
        {tab === "users" && <UserManagement />}
        {tab === "coupons" && <CouponManagement />}
      </main>
    </div>
  );
}

function GeneralCatalogue() {
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");
  const [editor, setEditor] = useState<{ item?: Item } | null>(null);
  const [delItem, setDelItem] = useState<Item | null>(null);
  const [delCat, setDelCat] = useState<Category | null>(null);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, i] = await Promise.all([api<Category[]>("/catalog/categories"), api<Item[]>("/catalog/items")]);
      setCats(c.filter((x) => x.is_general));
      setItems(i.filter((x) => x.is_general));
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

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast.show(ok); await load(); } catch (e: any) { setError(e.message); }
  };

  const addCategory = async () => {
    const name = (newCat || "").trim();
    setNewCat(null);
    if (!name) return;
    await run(async () => { const c = await api<Category>("/catalog/admin/categories", { method: "POST", body: JSON.stringify({ name }) }); setCat(c.id); }, "Category added");
  };
  const saveRename = async () => {
    if (!renaming) return;
    const { id, name } = renaming;
    setRenaming(null);
    if (name.trim()) await run(() => api(`/catalog/admin/categories/${id}`, { method: "PUT", body: JSON.stringify({ name: name.trim() }) }), "Category renamed");
  };

  const columns: Column<Item>[] = [
    { key: "name", label: "Item", primary: true, sortValue: (r) => r.name.toLowerCase(), render: (r) => (
      <div className="min-w-0"><p className="font-semibold text-slate-800 truncate">{r.name}</p>
        <p className="text-xs text-slate-400 truncate">{catName[r.category_id] || ""}{r.subcategory ? ` / ${r.subcategory}` : ""}{r.brand ? ` / ${r.brand}` : ""}</p></div>) },
    { key: "pricing", label: "Pricing", sortValue: (r) => r.pricing_type, render: (r) => <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{PRICING_LABEL[r.pricing_type] || r.pricing_type}</span> },
    { key: "base", label: "Default rate", align: "right", sortValue: (r) => r.base_rate, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{inr(r.base_rate)}</span> },
    { key: "labour", label: "Labour", align: "right", sortValue: (r) => r.labor_cost, render: (r) => <span className="text-slate-600 tabular-nums">{inr(r.labor_cost)}</span> },
    { key: "actions", label: "Actions", align: "right", render: (r) => (
      <div className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setEditor({ item: r })} aria-label={`Edit ${r.name}`} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-700"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => setDelItem(r)} aria-label={`Delete ${r.name}`} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>) },
  ];

  const pill = (id: string, label: string, n: number) => (
    <button key={id} onClick={() => setCat(id)} aria-pressed={cat === id}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left whitespace-nowrap flex-1 ${cat === id ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-100"}`}>
      {label}<span className="text-xs font-medium text-slate-400">{n}</span>
    </button>
  );
  const iconBtn = "p-1.5 rounded-lg text-slate-400 hover:bg-slate-100";
  const selected = cats.find((c) => c.id === cat);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <p className="text-slate-500 text-sm max-w-2xl">Every user sees this catalogue. The rates here are the defaults; each user can set their own private rate per item.</p>
        <button onClick={() => setEditor({})} disabled={cats.length === 0} className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm disabled:opacity-50">
          <Plus className="w-4 h-4" /> Add item
        </button>
      </div>
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}<button onClick={() => setError("")} className="font-bold underline">Dismiss</button>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)] items-start">
        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex xl:flex-col gap-0.5 overflow-x-auto">
          {pill("all", "All items", items.length)}
          {cats.map((c) => renaming?.id === c.id ? (
            <div key={c.id} className="flex items-center gap-1">
              <input autoFocus value={renaming.name} onChange={(e) => setRenaming({ id: c.id, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenaming(null); }}
                aria-label="Category name" className="px-3 py-2 rounded-xl border border-amber-400 text-sm bg-white min-w-[120px] w-full" />
              <button onClick={saveRename} aria-label="Save name" className={iconBtn}><Check className="w-4 h-4" /></button>
              <button onClick={() => setRenaming(null)} aria-label="Cancel rename" className={iconBtn}><X className="w-4 h-4" /></button>
            </div>
          ) : pill(c.id, c.name, counts[c.id] || 0))}
          {newCat === null ? (
            <button onClick={() => setNewCat("")} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 text-left whitespace-nowrap hover:bg-amber-50">+ New category</button>
          ) : (
            <input autoFocus value={newCat} onChange={(e) => setNewCat(e.target.value)} onBlur={addCategory}
              onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setNewCat(null); }}
              placeholder="Category name" aria-label="New category name" className="px-3 py-2 rounded-xl border border-amber-400 text-sm bg-white min-w-[140px]" />
          )}
          {selected && !renaming && (
            <div className="flex gap-1 pt-2 xl:border-t xl:mt-1 border-slate-100">
              <button onClick={() => setRenaming({ id: selected.id, name: selected.name })} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"><Pencil className="w-3 h-3" />Rename</button>
              <button onClick={() => setDelCat(selected)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50"><Trash2 className="w-3 h-3" />Delete</button>
            </div>
          )}
        </div>
        <DataTable rows={items} columns={columns} rowKey={(r) => r.id}
          searchText={(r) => `${r.name} ${r.brand} ${r.subcategory} ${catName[r.category_id] || ""}`}
          searchPlaceholder="Search items, brand or category" defaultSort="name" loading={loading}
          filter={(r) => cat === "all" || r.category_id === cat} filterKey={cat}
          emptyText="No items here yet. Add a category, then an item." />
      </div>

      {editor && (
        <ItemForm item={editor.item} cats={cats} basePath="/catalog/admin" defaultCat={cat !== "all" ? cat : cats[0]?.id}
          onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); toast.show("Item saved"); await load(); }} />
      )}
      {(delItem || delCat) && (
        <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-4" onClick={() => { setDelItem(null); setDelCat(null); }}>
          <div onClick={(e) => e.stopPropagation()} role="alertdialog" className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-extrabold text-slate-900">Delete {delItem ? delItem.name : delCat!.name}?</h2>
            <p className="text-sm text-slate-500">{delItem ? "It disappears for every user. Items used in existing quotations can't be deleted." : "Only empty categories can be deleted."}</p>
            <div className="flex gap-2">
              <button onClick={async () => {
                const i = delItem, c = delCat; setDelItem(null); setDelCat(null);
                if (i) await run(() => api(`/catalog/admin/items/${i.id}`, { method: "DELETE" }), "Item deleted");
                if (c) await run(async () => { await api(`/catalog/admin/categories/${c.id}`, { method: "DELETE" }); setCat("all"); }, "Category deleted");
              }} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl">Delete</button>
              <button onClick={() => { setDelItem(null); setDelCat(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
