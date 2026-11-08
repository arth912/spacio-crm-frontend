import { API_BASE_URL, getToken } from "./session";

export type TemplateId = "classic" | "modern" | "minimal" | "professional";

export const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "classic", name: "Classic", desc: "Traditional bordered invoice" },
  { id: "modern", name: "Modern", desc: "Bold colour header, striped rows" },
  { id: "minimal", name: "Minimal", desc: "Clean, text only, no colour" },
  { id: "professional", name: "Professional", desc: "GST ready with a side accent" },
];

export const templateName = (id?: string) => TEMPLATES.find((t) => t.id === id)?.name ?? "Modern";

export type PricingType = "piece" | "sq_ft" | "running_ft";

export const PRICING_OPTIONS: { id: PricingType; label: string; unit: string }[] = [
  { id: "piece", label: "Per piece", unit: "pc" },
  { id: "sq_ft", label: "Per sq ft", unit: "sq ft" },
  { id: "running_ft", label: "Per running ft", unit: "ft" },
];

/** `description` is the item name. Measured items bill qty x measure x rate, as in estimations. */
export interface BillItem {
  id?: string;
  description: string;
  qty: number;
  rate: number;
  tax_percent: number;
  amount?: number;
  pricing_type: PricingType;
  length: number;
  breadth: number;
  height: number;
  remark?: string | null;
}

/** Same rule as the estimation builder: piece = 1, running ft = length, sq ft = length x (height, else breadth, else 1). */
export function measureOf(it: Pick<BillItem, "pricing_type" | "length" | "breadth" | "height">): number {
  const l = Number(it.length) || 0;
  if (it.pricing_type === "running_ft") return l;
  if (it.pricing_type === "sq_ft") {
    const h = Number(it.height) || 0;
    const b = Number(it.breadth) || 0;
    return l * (h > 0 ? h : b > 0 ? b : 1);
  }
  return 1;
}

export interface Bill {
  id: string;
  bill_number: string;
  client_id: string;
  client_name?: string | null;
  project_id: string;
  project_name?: string | null;
  bill_date: string;
  due_date?: string | null;
  status: "draft" | "generated";
  template: TemplateId;
  customer_gstin?: string | null;
  notes?: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  balance: number;
  payment_status: "unpaid" | "partial" | "paid";
  created_at: string;
  items: BillItem[];
}

export type BillPayload = Pick<Bill, "client_id" | "project_id" | "bill_date" | "due_date" | "customer_gstin" | "notes" | "discount_amount"> & {
  items: Pick<BillItem, "description" | "qty" | "rate" | "tax_percent" | "pricing_type" | "length" | "breadth" | "height" | "remark">[];
};

export const MAX_BILL_ITEMS = 100;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Live preview only. The server recomputes every figure when the bill is saved. */
export function calcTotals(items: Pick<BillItem, "qty" | "rate" | "tax_percent" | "pricing_type" | "length" | "breadth" | "height">[], discount = 0) {
  let subtotal = 0;
  let tax = 0;
  const amounts = items.map((it) => {
    const base = round2((Number(it.qty) || 0) * measureOf(it) * (Number(it.rate) || 0));
    const lineTax = round2((base * (Number(it.tax_percent) || 0)) / 100);
    subtotal += base;
    tax += lineTax;
    return round2(base + lineTax);
  });
  subtotal = round2(subtotal);
  tax = round2(tax);
  const d = Math.max(0, Number(discount) || 0);
  return { amounts, subtotal, tax, discount: d, total: round2(subtotal + tax - d), discountTooHigh: d > subtotal + tax };
}

export const money = (n: number) =>
  "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const PAYMENT_PILL: Record<Bill["payment_status"], string> = {
  unpaid: "bg-rose-50 text-rose-700",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-50 text-emerald-700",
};

/** Download the bill PDF (auth header required, so it cannot be a plain link). Returns the saved file name. */
export async function downloadBillPdf(bill: Pick<Bill, "id" | "bill_date" | "client_name">): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}/bills/${bill.id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(res.status === 429 ? "Too many downloads. Try again in a minute." : "PDF generation failed");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  const safe = (bill.client_name || "Customer").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60);
  a.href = url;
  a.download = `Bill_${safe}_${bill.bill_date}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
