// frontend/src/services/apiClient.js
// Single place for all backend calls.

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path} :: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return null;
}

// ---- Transactions ----
export const txApi = {
  list: () => request("/api/transactions/"),
  create: (payload) =>
    request("/api/transactions/", { method: "POST", body: JSON.stringify(payload) }),
  get: (txId) => request(`/api/transactions/${encodeURIComponent(txId)}`),
};

// ---- Notes ----
export const notesApi = {
  listByTx: (txId) => request(`/api/notes/${encodeURIComponent(txId)}`),
  create: (payload) =>
    request("/api/notes/", { method: "POST", body: JSON.stringify(payload) }),
  deleteByTx: (txId) =>
    request(`/api/notes/${encodeURIComponent(txId)}`, { method: "DELETE" }),
};

// ---- Audit ----
export const auditApi = {
  list: () => request("/api/audit/"),
};
