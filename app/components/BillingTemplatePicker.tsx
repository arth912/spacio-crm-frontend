"use client";

import React from "react";
import { Check } from "lucide-react";
import { TEMPLATES, TemplateId } from "../lib/billing";

/** [left%, top%, width%, height%, background, outlineColor?] boxes drawn on a miniature page. */
type Box = [number, number, number, number, string, string?];

const G = "#CBD5E1";
const PREVIEWS: Record<TemplateId, Box[]> = {
  classic: [
    [8, 6.7, 35, 4.2, "#334155"], [65, 6.7, 27, 2.1, G], [65, 10.8, 20, 2.1, G],
    [8, 20, 84, 0.6, "#334155"], [8, 26.7, 84, 6.7, "transparent", "#334155"],
    [8, 36.7, 84, 0.5, G], [8, 44.2, 84, 0.5, G], [8, 51.7, 84, 0.5, G], [8, 59.2, 84, 0.5, G],
    [8, 71.7, 30, 2.1, G], [60, 71.7, 32, 3.3, "#334155"],
  ],
  modern: [
    [0, 0, 100, 23.3, "#D97706"], [8, 7.5, 30, 4.2, "#fff"], [65, 8.3, 27, 2.1, "#FDE68A"], [65, 12.5, 20, 2.1, "#FDE68A"],
    [8, 30, 84, 6.7, "#FEF3C7"], [8, 40, 84, 7.5, "#F1F5F9"], [8, 50.8, 84, 7.5, "#F8FAFC"], [8, 61.7, 84, 7.5, "#F1F5F9"],
    [8, 76.7, 30, 2.1, G], [54, 75, 38, 11.7, "#D97706"],
  ],
  minimal: [
    [8, 8.3, 25, 3.3, "#0F172A"], [8, 14.2, 35, 1.7, G], [65, 8.3, 27, 1.7, G], [8, 29.2, 84, 0.4, "#E2E8F0"],
    [8, 35, 45, 1.7, G], [75, 35, 17, 1.7, G], [8, 42.5, 45, 1.7, G], [75, 42.5, 17, 1.7, G],
    [8, 50, 45, 1.7, G], [75, 50, 17, 1.7, G], [8, 57.5, 45, 1.7, G], [75, 57.5, 17, 1.7, G],
    [65, 76.7, 27, 2.9, "#0F172A"],
  ],
  professional: [
    [0, 0, 4, 100, "#0F766E"], [12, 6.7, 35, 4.2, "#0F172A"],
    [12, 16.7, 35, 2.1, G], [55, 16.7, 37, 2.1, G], [12, 21.7, 30, 2.1, G], [55, 21.7, 30, 2.1, G],
    [12, 30.8, 80, 6.7, "#0F766E"],
    [12, 40.8, 80, 6.7, "transparent", "#E2E8F0"], [12, 49.2, 80, 6.7, "transparent", "#E2E8F0"], [12, 57.5, 80, 6.7, "transparent", "#E2E8F0"],
    [52, 71.7, 40, 18.3, "transparent", "#0F766E"], [57, 75.8, 30, 2.1, G], [57, 81.7, 30, 3.3, "#0F766E"],
  ],
};

/** A miniature, decorative page that hints at the template's look. Paper stays white in dark mode on purpose. */
export function TemplatePreview({ id }: { id: TemplateId }) {
  return (
    <div aria-hidden="true" className="relative w-full aspect-[5/6] overflow-hidden rounded-lg border border-slate-200 [background:#fff]">
      {PREVIEWS[id].map(([l, t, w, h, bg, outline], i) => (
        <span
          key={i}
          className="absolute rounded-[2px]"
          style={{ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, background: bg, ...(outline ? { border: `1px solid ${outline}` } : {}) }}
        />
      ))}
    </div>
  );
}

interface Props {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

export default function BillingTemplatePicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Billing template" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
      {TEMPLATES.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            className={`text-left rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-w-0 transition-colors bg-white border focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              selected ? "border-2 border-amber-400 bg-amber-50/60" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <TemplatePreview id={t.id} />
            <span className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-slate-800">{t.name}</span>
                <span className="block text-xs text-slate-500 leading-snug">{t.desc}</span>
              </span>
              <span
                className={`w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center border ${
                  selected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300"
                }`}
              >
                {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
