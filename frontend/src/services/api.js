// src/services/api.js
// Real API client for FastAPI backend (http://127.0.0.1:8000)

const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

async function request(path, { method = "GET", body, headers } = {}) {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle non-JSON errors safely
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text || null;
  }

  if (!res.ok) {
    const msg =
      (data && data.detail && JSON.stringify(data.detail)) ||
      (data && data.message) ||
      (typeof data === "string" ? data : null) ||
      `${res.status} ${res.statusText}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// -------- AUTH (still mock for now) --------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function login(email, password) {
  await sleep(200);
  if (!email || !password) throw new Error("Missing email/password");

  const lower = email.toLowerCase();
  const role = lower.includes("super")
    ? "superadmin"
    : lower.includes("admin")
    ? "admin"
    : "analyst";

  return {
    token: `demo-token-${role}-${Date.now()}`,
    role,
    user: { email },
  };
}

// -------- Transactions (DB) --------
export async function apiGetTransactions() {
  return request("/api/transactions/", { method: "GET" });
}

export async function apiCreateTransaction(payload) {
  return request("/api/transactions/", { method: "POST", body: payload });
}

// -------- Notes (DB) --------
export async function apiGetNote(tx_id) {
  return request(`/api/notes/${encodeURIComponent(tx_id)}`, { method: "GET" });
}

export async function apiUpsertNote(payload) {
  // expects { tx_id, note }
  return request(`/api/notes/`, { method: "PUT", body: payload });
}

export async function apiDeleteNote(tx_id) {
  return request(`/api/notes/${encodeURIComponent(tx_id)}`, { method: "DELETE" });
}

// -------- Audit (DB) --------
export async function apiGetAuditLogs() {
  return request("/api/audit/", { method: "GET" });
}

export async function apiCreateAuditLog(payload) {
  // expects { action, meta }
  return request("/api/audit/", { method: "POST", body: payload });
}

// -------- helper: generate a DB-compatible transaction payload --------
export function generateTxPayload(overrides = {}) {
  const tx_id = overrides.tx_id || `TX-${Math.floor(1000 + Math.random() * 9000)}`;

  const amounts = [120, 250, 499, 800, 1200, 2500, 6000, 8500, 15000, 23000];
  const amount = overrides.amount ?? amounts[Math.floor(Math.random() * amounts.length)];

  const users = ["User A", "User B", "User C", "User D", "User E"];
  const user = overrides.user || users[Math.floor(Math.random() * users.length)];

  const channels = ["POS", "Online", "ATM", "Wire", "Mobile App"];
  const channel = overrides.channel || channels[Math.floor(Math.random() * channels.length)];

  const countries = ["AE", "AE", "AE", "US", "GB", "DE", "IN", "NG"];
  const country = overrides.country || countries[Math.floor(Math.random() * countries.length)];

  const devices = ["iPhone", "Android", "Web", "ATM-Terminal"];
  const device = overrides.device || devices[Math.floor(Math.random() * devices.length)];

  const merchants = ["Noon", "Amazon", "Carrefour", "Apple", "Netflix", "Talabat"];
  const merchant = overrides.merchant || merchants[Math.floor(Math.random() * merchants.length)];

  const cardTypes = ["VISA", "MASTERCARD", "AMEX"];
  const card_type = overrides.card_type || cardTypes[Math.floor(Math.random() * cardTypes.length)];

  const hour = overrides.hour ?? new Date().getHours();

  // IMPORTANT: backend expects ISO datetime for ts
  const ts = overrides.ts || new Date().toISOString();

  return {
    tx_id,
    user,
    amount,
    country,
    device,
    channel,
    merchant,
    card_type,
    hour,
    ts,
    ...overrides,
  };
}
