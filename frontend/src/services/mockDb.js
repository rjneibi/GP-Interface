// frontend/src/services/mockDb.js
import { getSettings } from "./adminStore";
import { getAnalysts, initAnalystStore } from "./analystStore";

const nowIso = () => new Date().toISOString();

const computeRisk = (amount) => {
  const maxAmount = 40000;
  const a = Number(amount || 0);
  return Math.min(100, Math.round((a / maxAmount) * 100));
};

const priorityFromRisk = (risk) => {
  if (risk >= 90) return "CRITICAL";
  if (risk >= 75) return "HIGH";
  if (risk >= 55) return "MEDIUM";
  return "LOW";
};

const requiredTierFromPriority = (priority) => {
  // Tier 2 handles HIGH/CRITICAL
  return priority === "HIGH" || priority === "CRITICAL" ? "T2" : "T1";
};

const reasonCodesFromTx = (tx, risk, settings) => {
  const reasons = [];
  const orange = settings?.orangeThreshold ?? 40;
  const red = settings?.redThreshold ?? 70;

  if (risk >= red) reasons.push(`Risk above RED threshold (${red}%)`);
  else if (risk >= orange) reasons.push(`Risk above ORANGE threshold (${orange}%)`);

  if (Number(tx.amount || 0) >= 15000) reasons.push("High amount");
  if (tx.country && tx.country !== "UAE") reasons.push("Foreign origin detected");
  if (String(tx.merchant || "").toLowerCase().includes("crypto")) reasons.push("High-risk merchant category");
  if (String(tx.device || "").toUpperCase() === "ATM" || String(tx.channel || "").toUpperCase() === "ATM")
    reasons.push("ATM channel/device risk");

  if (reasons.length < 2) reasons.push("Anomalous pattern detected");
  return reasons.slice(0, 5);
};

/* -------------------- In-memory stores -------------------- */

let transactions = [
  {
    tx_id: "TX-1001",
    user: "User A",
    amount: 12500,
    country: "UAE",
    device: "iPhone",
    channel: "Web",
    merchant: "Noon",
    card_type: "VISA",
    hour: 14,
    ts: nowIso(),
  },
];

let notesByTx = {
  "TX-1001": [
    {
      id: "N-1",
      tx_id: "TX-1001",
      note: "High amount + first time merchant. Investigate device and location mismatch.",
      content: "High amount + first time merchant. Investigate device and location mismatch.",
      created_at: nowIso(),
    },
  ],
};

let auditLogs = [
  {
    id: "A-1",
    action: "MOCK_BOOT",
    meta: { message: "Mock data initialized" },
    created_at: nowIso(),
  },
];

/**
 * Case model (frontend contract)
 * case_id, tx_id, risk_score, priority, status, assigned_to, sla_due_at, reason_codes, created_at
 */
let cases = [
  {
    case_id: "CASE-001",
    tx_id: "TX-1001",
    risk_score: 0,
    priority: "MEDIUM",
    status: "NEW",
    assigned_to: null,
    sla_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    reason_codes: ["Auto-generated demo case"],
    created_at: nowIso(),
  },
];

// init analyst roster (stored in localStorage)
initAnalystStore();

// Boot-time normalize seed case
(function bootstrapCaseSeed() {
  const settings = getSettings?.() || { orangeThreshold: 40, redThreshold: 70 };
  const tx = transactions.find((t) => t.tx_id === "TX-1001");
  if (!tx) return;

  const risk = computeRisk(tx.amount);
  cases = cases.map((c) =>
    c.tx_id === "TX-1001"
      ? {
          ...c,
          risk_score: risk,
          priority: priorityFromRisk(risk),
          reason_codes: reasonCodesFromTx(tx, risk, settings),
        }
      : c
  );
})();

/* -------------------- Assignment engine -------------------- */

function activeCaseCountForAnalyst(analystId) {
  return cases.filter((c) => c.assigned_to === analystId && c.status !== "CLOSED").length;
}

function slaPressureScore(analystId) {
  const now = Date.now();
  const dueSoon = cases.filter((c) => {
    if (c.assigned_to !== analystId) return false;
    if (c.status === "CLOSED") return false;
    const mins = Math.max(0, Math.floor((new Date(c.sla_due_at).getTime() - now) / 60000));
    return mins <= 30;
  }).length;

  // each due-soon case adds penalty
  return dueSoon * 3;
}

function pickAssignee(requiredTier) {
  const roster = getAnalysts();

  const active = roster.filter((a) => a.active);

  // Tier rule:
  // - T2 required: only T2
  // - T1 required: prefer T1, but allow T2 fallback
  let eligible = [];
  if (requiredTier === "T2") {
    eligible = active.filter((a) => a.tier === "T2");
  } else {
    const t1 = active.filter((a) => a.tier === "T1");
    eligible = t1.length ? t1 : active.filter((a) => a.tier === "T2");
  }

  if (!eligible.length) return null;

  // Workload-balanced score
  const scored = eligible.map((a) => {
    const load = activeCaseCountForAnalyst(a.id);
    const pressure = slaPressureScore(a.id);
    const score = load + pressure;
    return { analyst: a, score, load, pressure };
  });

  scored.sort((x, y) => x.score - y.score);
  return scored[0].analyst;
}

function autoAssignCase(caseObj) {
  if (!caseObj) return null;
  if (caseObj.assigned_to) return caseObj; // already assigned

  const requiredTier = requiredTierFromPriority(caseObj.priority);
  const assignee = pickAssignee(requiredTier);

  if (!assignee) return caseObj;

  cases = cases.map((c) =>
    c.case_id === caseObj.case_id
      ? { ...c, assigned_to: assignee.id, assigned_tier: assignee.tier }
      : c
  );

  mockDb.addAudit("CASE_ASSIGNED", {
    case_id: caseObj.case_id,
    tx_id: caseObj.tx_id,
    assigned_to: assignee.id,
    analyst_email: assignee.email,
    tier: assignee.tier,
    requiredTier,
  });

  return mockDb.getCase(caseObj.case_id);
}

/* -------------------- API-like methods -------------------- */

export const mockDb = {
  /* -------------------- Transactions -------------------- */
  listTx() {
    return [...transactions].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  },

  getTx(txId) {
    return transactions.find((t) => t.tx_id === txId) || null;
  },

  createTx(payload) {
    const tx = {
      ...payload,
      tx_id: payload.tx_id || `TX-${Math.floor(1000 + Math.random() * 9000)}`,
      ts: payload.ts || nowIso(),
    };
    transactions = [tx, ...transactions];
    return tx;
  },

  /* -------------------- Notes -------------------- */
  listNotes(txId) {
    return Array.isArray(notesByTx[txId]) ? [...notesByTx[txId]] : [];
  },

  createNote(payload) {
    const tx_id = payload.tx_id;
    if (!tx_id) throw new Error("tx_id is required");

    const text = payload.note ?? payload.content ?? "";

    const note = {
      id: `N-${Math.floor(1000 + Math.random() * 9000)}`,
      tx_id,
      note: text,
      content: text,
      created_at: nowIso(),
    };

    notesByTx[tx_id] = [note, ...(notesByTx[tx_id] || [])];
    return note;
  },

  deleteNotes(txId) {
    delete notesByTx[txId];
    return { ok: true };
  },

  /* -------------------- Audit -------------------- */
  listAudit() {
    return [...auditLogs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addAudit(action, meta = {}) {
    const entry = {
      id: `A-${Math.floor(1000 + Math.random() * 9000)}`,
      action,
      meta,
      created_at: nowIso(),
    };
    auditLogs = [entry, ...auditLogs];
    return entry;
  },

  /* -------------------- Analysts (roster) -------------------- */
  listAnalysts() {
    return getAnalysts();
  },

  updateAnalyst(id, patch) {
    // delegated to analystStore via update function (Admin uses it directly)
    // This method exists for symmetry if you want later.
    // (No-op here)
    return { ok: true };
  },

  /* -------------------- Cases -------------------- */
  listCases() {
    return [...cases].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getCase(caseId) {
    return cases.find((c) => c.case_id === caseId) || null;
  },

  updateCase(caseId, patch) {
    cases = cases.map((c) => (c.case_id === caseId ? { ...c, ...patch } : c));
    return this.getCase(caseId);
  },

  /**
   * Auto-create case if policy says it needs human review.
   * Policy: risk >= RED threshold => create (or upsert) a case.
   * One case per tx_id.
   */
  maybeCreateCaseFromTx(tx) {
    const settings = getSettings?.() || { orangeThreshold: 40, redThreshold: 70 };
    const red = settings?.redThreshold ?? 70;

    const risk = computeRisk(tx.amount);
    if (risk < red) return null;

    const existing = cases.find((c) => c.tx_id === tx.tx_id);
    const now = nowIso();

    const priority = priorityFromRisk(risk);

    const base = {
      tx_id: tx.tx_id,
      risk_score: risk,
      priority,
      status: existing?.status ?? "NEW",
      assigned_to: existing?.assigned_to ?? null,
      sla_due_at:
        risk >= 90
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          : risk >= 75
          ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          : risk >= 55
          ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      reason_codes: reasonCodesFromTx(tx, risk, settings),
      created_at: existing?.created_at ?? now,
    };

    let out = null;

    if (existing) {
      cases = cases.map((c) => (c.tx_id === tx.tx_id ? { ...c, ...base } : c));
      out = this.getCase(existing.case_id);
    } else {
      const case_id = `CASE-${String(Math.floor(1 + Math.random() * 999)).padStart(3, "0")}`;
      const newCase = { case_id, ...base };
      cases = [newCase, ...cases];

      this.addAudit("CASE_CREATED", { case_id, tx_id: tx.tx_id, risk_score: risk });
      out = newCase;
    }

    // ✅ skill-based auto assignment
    out = autoAssignCase(out);
    return out;
  },
};
