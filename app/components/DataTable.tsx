"use client";

import React, { useEffect, useMemo, useState } from "react";
import DebouncedInput from "./DebouncedInput";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  /** Value used for sorting. Leave out to make the column unsortable (for example, actions). */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  align?: "right";
  /** Shown as the card title on phones instead of a label and value pair. */
  primary?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText: (row: T) => string;
  searchPlaceholder: string;
  defaultSort: string;
  pageSize?: number;
  /** Extra filter applied before search. Change `filterKey` when it changes so paging resets. */
  filter?: (row: T) => boolean;
  filterKey?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  loading?: boolean;
  emptyText?: string;
  /** Bare variant drops the outer card so the table can sit inside another one. */
  bare?: boolean;
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder,
  defaultSort,
  pageSize: initialPageSize = 10,
  filter,
  filterKey = "",
  toolbar,
  onRowClick,
  selectedKey,
  loading,
  emptyText = "Nothing here yet.",
  bare,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState(defaultSort);
  const [dir, setDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => setPage(1), [q, sortKey, dir, filterKey, pageSize]);

  const processed = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter((r) => (!filter || filter(r)) && (!needle || searchText(r).toLowerCase().includes(needle)));
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortValue) {
      const get = col.sortValue;
      out = [...out].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sortKey, dir, filterKey]);

  const pages = Math.max(1, Math.ceil(processed.length / pageSize));
  const current = Math.min(page, pages);
  const slice = processed.slice((current - 1) * pageSize, current * pageSize);
  const from = processed.length ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(processed.length, current * pageSize);

  const sortable = columns.filter((c) => c.sortValue);
  const clickSort = (key: string) => {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDir(1);
    }
  };

  const pageButtons = useMemo(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, current - 1, current, current + 1]);
    return Array.from(set).filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  }, [pages, current]);

  const primary = columns.find((c) => c.primary) || columns[0];
  const emptyMsg = q.trim() ? `No matches for “${q.trim()}”. Try another word.` : emptyText;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <label className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/15">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <DebouncedInput
            type="search"
            value={q}
            delay={150}
            onValueChange={setQ}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="flex-1 min-w-0 bg-transparent border-0 py-2.5 text-sm text-slate-800 outline-none focus:ring-0 focus:shadow-none"
          />
        </label>
        <select
          value={sortKey}
          onChange={(e) => {
            setSortKey(e.target.value);
            setDir(1);
          }}
          aria-label="Sort by"
          className="md:hidden bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700"
        >
          {sortable.map((c) => (
            <option key={c.key} value={c.key}>
              Sort: {c.label}
            </option>
          ))}
        </select>
        {toolbar}
      </div>

      <div className={bare ? "" : "bg-white border border-slate-200 rounded-2xl p-2"}>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((c) => {
                  const on = sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={on ? (dir === 1 ? "ascending" : "descending") : c.sortValue ? "none" : undefined}
                      className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${c.align === "right" ? "text-right" : "text-left"} ${on ? "text-amber-700" : "text-slate-400"}`}
                    >
                      {c.sortValue ? (
                        <button
                          onClick={() => clickSort(c.key)}
                          className={`inline-flex items-center gap-1.5 hover:text-slate-700 rounded ${c.align === "right" ? "flex-row-reverse" : ""}`}
                        >
                          {c.label}
                          {on ? dir === 1 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> : <ChevronsUpDown className="w-3 h-3 opacity-50" />}
                        </button>
                      ) : (
                        <span className="sr-only">{c.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td colSpan={columns.length} className="px-3 py-4">
                      <div className="h-4 rounded bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : slice.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-500">
                    {emptyMsg}
                  </td>
                </tr>
              ) : (
                slice.map((r) => {
                  const k = rowKey(r);
                  const on = selectedKey === k;
                  return (
                    <tr
                      key={k}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(r)) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      className={`border-b border-slate-100 last:border-0 ${onRowClick ? "cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" : ""} ${on ? "bg-amber-50" : ""}`}
                    >
                      {columns.map((c) => (
                        <td key={c.key} className={`px-3 py-3.5 ${c.align === "right" ? "text-right" : ""}`}>
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phone cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : slice.length === 0 ? (
            <p className="px-3 py-10 text-center text-slate-500 text-sm">{emptyMsg}</p>
          ) : (
            slice.map((r) => {
              const k = rowKey(r);
              const on = selectedKey === k;
              return (
                <div
                  key={k}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={`p-3 space-y-2 rounded-xl ${onRowClick ? "cursor-pointer" : ""} ${on ? "bg-amber-50" : ""}`}
                >
                  <div>{primary.render(r)}</div>
                  {columns
                    .filter((c) => c !== primary)
                    .map((c) => (
                      <div key={c.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{c.sortValue ? c.label : ""}</span>
                        <span className={c.sortValue ? "text-right" : "w-full flex justify-end gap-2"}>{c.render(r)}</span>
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3 pb-1.5 mt-1 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Showing {from}–{to} of {processed.length}
            </span>
            <label className="flex items-center gap-1.5">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Rows per page"
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700"
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              onClick={() => setPage(current - 1)}
              disabled={current === 1}
              aria-label="Previous page"
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageButtons.map((p, i) => (
              <React.Fragment key={p}>
                {i > 0 && p - pageButtons[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                <button
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  aria-current={p === current ? "page" : undefined}
                  className={`min-w-[32px] h-8 px-2 rounded-lg border text-xs font-semibold ${p === current ? "bg-amber-100 border-transparent text-amber-800" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"}`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <button
              onClick={() => setPage(current + 1)}
              disabled={current === pages}
              aria-label="Next page"
              className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
