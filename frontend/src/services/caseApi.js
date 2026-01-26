// src/services/caseApi.js
import { mockDb } from "./mockDb";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";
const USE_MOCKS =
  String(import.meta.env.VITE_USE_MOCKS || "").toLowerCase() === "true";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

export const caseApi = {
  async list() {
    if (USE_MOCKS) {
      await sleep(120);
      return mockDb.listCases();
    }
    return request("/api/cases/");
  },

  async get(caseId) {
    if (USE_MOCKS) {
      await sleep(100);
      const c = mockDb.getCase(caseId);
      if (!c) throw new Error("Case not found");
      return c;
    }
    return request(`/api/cases/${caseId}`);
  },

  async create(payload) {
    if (USE_MOCKS) {
      await sleep(150);
      const c = mockDb.createCase(payload);
      return c;
    }
    return request("/api/cases/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(caseId, patch) {
    if (USE_MOCKS) {
      await sleep(120);
      const c = mockDb.updateCase(caseId, patch);
      if (!c) throw new Error("Case not found");
      return c;
    }
    return request(`/api/cases/${caseId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async delete(caseId) {
    if (USE_MOCKS) {
      await sleep(100);
      return mockDb.deleteCase(caseId);
    }
    return request(`/api/cases/${caseId}`, {
      method: "DELETE",
    });
  },
};
