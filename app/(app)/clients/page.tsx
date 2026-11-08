"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Mail, Phone, MapPin, ArrowRight, Pencil, X, Loader2 } from "lucide-react";
import TopBar from "../../components/TopBar";
import DataTable, { Column } from "../../components/DataTable";
import { api, inr } from "../../lib/api";

interface Client { id: string; name: string; phone: string; email?: string | null; address?: string | null; created_at: string }
interface Project { id: string; client_id: string; name: string; status: string }
interface Quote { id: string; project_id: string; status: string; grand_total: number; version: number }

interface Row extends Client {
  projects: Project[];
  approved: number;
  active: number;
}

const initial = (n: string) => (n || "?").trim()[0]?.toUpperCase() || "?";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: "add" | "edit"; client?: Client } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, p, q] = await Promise.all([
        api<Client[]>("/clients"),
        api<Project[]>("/projects"),
        api<Quote[]>("/quotations").catch(() => [] as Quote[]),
      ]);
      setClients(c);
      setProjects(p);
      setQuotes(q);
    } catch (e: any) {
      setError(e.message || "Couldn't load clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows: Row[] = useMemo(
    () =>
      clients.map((c) => {
        const ps = projects.filter((p) => p.client_id === c.id);
        const ids = new Set(ps.map((p) => p.id));
        const cancelled = new Set(ps.filter((p) => p.status === "Cancelled").map((p) => p.id));
        return {
          ...c,
          projects: ps,
          active: ps.filter((p) => p.status !== "Completed" && p.status !== "Cancelled" && quotes.some((q) => q.project_id === p.id && q.status === "approved")).length,
          approved: quotes.filter((q) => ids.has(q.project_id) && q.status === "approved" && !cancelled.has(q.project_id)).reduce((s, q) => s + q.grand_total, 0),
        };
      }),
    [clients, projects, quotes]
  );

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: "Client",
      primary: true,
      sortValue: (r) => r.name.toLowerCase(),
      render: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{initial(r.name)}</div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{r.name}</p>
            {r.email && <p className="text-xs text-slate-400 truncate">{r.email}</p>}
          </div>
        </div>
      ),
    },
    { key: "phone", label: "Phone", sortValue: (r) => r.phone, render: (r) => <span className="text-slate-600 tabular-nums whitespace-nowrap">{r.phone}</span> },
    {
      key: "projects",
      label: "Projects",
      sortValue: (r) => r.projects.length,
      render: (r) =>
        r.projects.length === 0 ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">No project</span>
        ) : (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
            {r.projects.length} {r.projects.length === 1 ? "project" : "projects"}
            {r.active ? `, ${r.active} active` : ""}
          </span>
        ),
    },
    { key: "approved", label: "Approved value", align: "right", sortValue: (r) => r.approved, render: (r) => <span className="font-bold text-slate-800 tabular-nums">{inr(r.approved)}</span> },
  ];

  const current = rows.find((r) => r.id === selected) || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
      <TopBar />
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clients</h1>
            <p className="text-slate-500 mt-1 text-sm">Everyone you design for, with their projects and contact details.</p>
          </div>
          <button onClick={() => setForm({ mode: "add" })} className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-sm">
            <Plus className="w-4 h-4" /> Add client
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
            <button onClick={load} className="font-bold underline">Retry</button>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.name} ${r.phone} ${r.email || ""} ${r.address || ""}`}
            searchPlaceholder="Search by name, phone or email"
            defaultSort="name"
            loading={loading}
            emptyText="No clients yet. Add your first client to get started."
            onRowClick={(r) => setSelected(r.id)}
            selectedKey={selected}
          />
          <aside className="bg-white border border-slate-200 rounded-2xl p-5 xl:sticky xl:top-24">
            {current ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-600 to-stone-700 text-white font-extrabold flex items-center justify-center">{initial(current.name)}</div>
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-slate-900 truncate">{current.name}</h2>
                    <p className="text-xs text-slate-400">Client since {new Date(current.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2.5 text-slate-600"><Phone className="w-4 h-4 text-slate-400" /><a href={`tel:${current.phone}`} className="hover:text-amber-700">{current.phone}</a></div>
                  {current.email && <div className="flex items-center gap-2.5 text-slate-600 min-w-0"><Mail className="w-4 h-4 text-slate-400 shrink-0" /><a href={`mailto:${current.email}`} className="hover:text-amber-700 truncate">{current.email}</a></div>}
                  {current.address && <div className="flex items-start gap-2.5 text-slate-600"><MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /><span>{current.address}</span></div>}
                </dl>
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-slate-400 mb-2">PROJECTS</p>
                  {current.projects.length === 0 ? (
                    <p className="text-sm text-slate-500">No projects yet.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {current.projects.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <span className="text-slate-700 truncate">{p.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">{p.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Link href={`/clients/${current.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl">
                    Open client <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button onClick={() => setForm({ mode: "edit", client: current })} className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Edit client">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">Select a client to see their details.</p>
            )}
          </aside>
        </div>
      </main>

      {form && (
        <ClientForm
          mode={form.mode}
          client={form.client}
          onClose={() => setForm(null)}
          onSaved={async (id) => {
            setForm(null);
            await load();
            setSelected(id);
          }}
        />
      )}
    </div>
  );
}

function ClientForm({ mode, client, onClose, onSaved }: { mode: "add" | "edit"; client?: Client; onClose: () => void; onSaved: (id: string) => void }) {
  const [v, setV] = useState({ name: client?.name || "", phone: client?.phone || "", email: client?.email || "", address: client?.address || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim() || !v.phone.trim()) {
      setErr("Enter a name and a phone number.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const body = JSON.stringify({ name: v.name.trim(), phone: v.phone.trim(), email: v.email.trim() || null, address: v.address.trim() || null });
      const saved = mode === "add"
        ? await api<Client>("/clients", { method: "POST", body })
        : await api<Client>(`/clients/${client!.id}`, { method: "PUT", body });
      onSaved(saved.id);
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const field = "w-full mt-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white";
  return (
    <div className="fixed inset-0 z-[80] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900">{mode === "add" ? "Add client" : "Edit client"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-xs font-bold text-slate-500">Name<input className={field} type="text" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus /></label>
        <label className="block text-xs font-bold text-slate-500">Phone<input className={field} type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></label>
        <label className="block text-xs font-bold text-slate-500">Email<input className={field} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
        <label className="block text-xs font-bold text-slate-500">Address<textarea className={field} rows={2} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></label>
        {err && <p role="alert" className="text-sm text-rose-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm px-4 py-2.5 rounded-xl disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {mode === "add" ? "Add client" : "Save changes"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
