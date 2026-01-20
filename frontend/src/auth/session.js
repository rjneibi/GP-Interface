// src/auth/session.js
const KEY = "sf_session_v1";

export function setSession({ token, role, user, tier = null }) {
  localStorage.setItem(KEY, JSON.stringify({ token, role, user, tier }));
}

export function getSession() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function isAuthed() {
  const s = getSession();
  return Boolean(s?.token);
}

export function getRole() {
  return getSession()?.role || null;
}

export function getUser() {
  return getSession()?.user || null;
}

export function getTier() {
  return getSession()?.tier || null; // "T1" | "T2" | null
}
