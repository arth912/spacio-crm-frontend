// Shared session helpers: token storage keys, logout, cross-tab sync.
export const TOKEN_KEY = "decocrm_auth_token";
export const USER_KEY = "decocrm_user";
export const LAST_ACTIVE_KEY = "decocrm_last_active";
export const LOGOUT_SIGNAL_KEY = "decocrm_logout_signal";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Minutes of inactivity before the user is signed out. */
export const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES || 30);
/** Seconds of "still there?" warning shown before the idle sign-out. */
export const IDLE_WARNING_SECONDS = 60;

export type LogoutReason = "idle" | "expired" | "manual";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {}
}

/**
 * Sign out: optionally tell the server (invalidates the account's tokens on every device),
 * clear local data, notify other tabs and go to the login page.
 */
export async function performLogout(reason: LogoutReason, opts: { serverSide?: boolean } = {}) {
  const token = getToken();
  if (opts.serverSide !== false && token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      });
    } catch {}
  }
  clearSession();
  try {
    // storage event wakes the other tabs
    localStorage.setItem(LOGOUT_SIGNAL_KEY, `${reason}:${Date.now()}`);
  } catch {}
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace(`/login?reason=${reason}`);
  }
}
