// src/services/caseApi.js
import { mockDb } from "./mockDb";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const caseApi = {
  async list() {
    await sleep(120);
    return mockDb.listCases();
  },

  async get(caseId) {
    await sleep(100);
    const c = mockDb.getCase(caseId);
    if (!c) throw new Error("Case not found");
    return c;
  },

  async update(caseId, patch) {
    await sleep(120);
    const c = mockDb.updateCase(caseId, patch);
    if (!c) throw new Error("Case not found");
    return c;
  },
};
