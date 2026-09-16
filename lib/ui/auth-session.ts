/**
 * Prototype session flag — UI gate only. Real auth lands with the identity
 * provider; until then login/register just mark the device as signed in so the
 * routes and CTAs can behave like a finished product.
 */

const KEY = "askgov.session.v1";

export interface SessionUser {
  email: string;
  name?: string;
  at: number;
}

export function readSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(user: Omit<SessionUser, "at">): void {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ ...user, at: Date.now() } satisfies SessionUser),
  );
}

export function clearSession(): void {
  window.localStorage.removeItem(KEY);
}
