// src/services/analystStore.js
const KEY = "sf_analyst_roster_v1";

function readJSON(fallback) {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(value) {
  localStorage.setItem(KEY, JSON.stringify(value));
}

export function initAnalystStore() {
  const existing = readJSON(null);
  if (existing) return;

  writeJSON([
    { id: "AN-01", email: "analyst@bank.com", name: "Analyst A", tier: "T1", active: true },
    { id: "AN-02", email: "analyst2@bank.com", name: "Analyst B", tier: "T1", active: true },
    { id: "AN-03", email: "senior@bank.com", name: "Senior Analyst", tier: "T2", active: true },
  ]);
}

export function getAnalysts() {
  initAnalystStore();
  return readJSON([]);
}

export function getAnalystByEmail(email) {
  if (!email) return null;
  const list = getAnalysts();
  return list.find((a) => a.email.toLowerCase() === String(email).toLowerCase()) || null;
}

export function updateAnalyst(id, patch) {
  const list = getAnalysts();
  const next = list.map((a) => (a.id === id ? { ...a, ...patch } : a));
  writeJSON(next);
  return next.find((a) => a.id === id) || null;
}
