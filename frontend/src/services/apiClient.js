// src/services/apiClient.js
// Single place for all backend calls.
// Supports MOCK mode while keeping a fixed API contract.

import { mockDb } from "./mockDb";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const USE_MOCKS =
  String(import.meta.env.VITE_USE_MOCKS || "").toLowerCase() === "true";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options = {}) {
  // Add authorization token if available
  const token = localStorage.getItem("access_token");
  const headers = { 
    "Content-Type": "application/json", 
    ...(options.headers || {}) 
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
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
  async list() {
    if (USE_MOCKS) {
      await sleep(150);
      return mockDb.listTx();
    }
    return request("/api/transactions/");
  },

  async create(payload) {
    if (USE_MOCKS) {
      await sleep(150);

      const tx = mockDb.createTx(payload);

      // ✅ Auto-create a case if policy triggers (risk >= RED)
      if (typeof mockDb.maybeCreateCaseFromTx === "function") {
        mockDb.maybeCreateCaseFromTx(tx);
      }

      mockDb.addAudit("TX_CREATED", { tx_id: tx.tx_id, amount: tx.amount });
      return tx;
    }

    return request("/api/transactions/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async get(txId) {
    if (USE_MOCKS) {
      await sleep(120);
      const tx = mockDb.getTx(txId);
      if (!tx) throw new Error("Transaction not found");
      return tx;
    }
    return request(`/api/transactions/${encodeURIComponent(txId)}`);
  },

  async delete(txId) {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDb.deleteTx(txId);
    }
    return request(`/api/transactions/${encodeURIComponent(txId)}`, {
      method: "DELETE",
    });
  },

  async exportCsv() {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/api/transactions/export/csv`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    
    return response.blob();
  },
};

// ---- Notes ----
export const notesApi = {
  async listByTx(txId) {
    if (USE_MOCKS) {
      await sleep(120);
      return mockDb.listNotes(txId); // ALWAYS array
    }

    const data = await request(`/api/notes/${encodeURIComponent(txId)}`);
    return Array.isArray(data) ? data : data ? [data] : [];
  },

  async create(payload) {
    if (USE_MOCKS) {
      await sleep(150);
      const note = mockDb.createNote(payload);
      mockDb.addAudit("NOTE_ADDED", { tx_id: payload.tx_id });
      return note;
    }

    return request("/api/notes/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteByTx(txId) {
    if (USE_MOCKS) {
      await sleep(120);
      const out = mockDb.deleteNotes(txId);
      mockDb.addAudit("NOTES_DELETED", { tx_id: txId });
      return out;
    }

    return request(`/api/notes/${encodeURIComponent(txId)}`, { method: "DELETE" });
  },
};

// ---- Audit ----
export const auditApi = {
  async list() {
    if (USE_MOCKS) {
      await sleep(120);
      return mockDb.listAudit();
    }
    return request("/api/audit/");
  },
};
