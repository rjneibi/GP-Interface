// frontend/src/services/txStore.js
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path} :: ${text}`);
  }
  return res.json();
}

// ---- Transactions API ----
export async function fetchTxRows() {
  return await jsonFetch("/api/transactions/");
}

export async function createTx(payload) {
  return await jsonFetch("/api/transactions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
