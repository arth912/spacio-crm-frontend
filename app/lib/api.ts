import { API_BASE_URL, USER_KEY, clearSession, getToken } from "./session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Authenticated JSON request. Sends the user to the login page when the session is rejected. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new ApiError("Your session expired. Sign in again.", 401);
  }
  if (!res.ok) {
    let detail = "Something went wrong. Try again.";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg) detail = body.detail[0].msg;
    } catch {}
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface StoredUser {
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  company_logo?: string | null;
  general_terms?: string | null;
  billing_terms?: string | null;
  signature?: string | null;
  stamp?: string | null;
  billing_template?: string;
}

export function storeUser(user: StoredUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export const inr = (n: number) => "₹" + Math.round(n || 0).toLocaleString("en-IN");

export const PRICING_LABEL: Record<string, string> = {
  sq_ft: "sq ft",
  running_ft: "running ft",
  piece: "piece",
};

export const STATUS_PILL: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  revised: "bg-blue-50 text-blue-700",
  rejected: "bg-rose-50 text-rose-700",
};
