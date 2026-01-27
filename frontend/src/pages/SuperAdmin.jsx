import { useEffect, useMemo, useState } from "react";
import { getAnalysts, updateAnalyst, initAnalystStore } from "../services/analystStore";
import { mockDb } from "../services/mockDb";

initAnalystStore();

function readSnap() {
  return {
    analysts: getAnalysts(),
    audit: mockDb.listAudit(),
  };
}

export default function SuperAdmin() {
  const [snap, setSnap] = useState(() => readSnap());
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setInterval(() => setSnap(readSnap()), 700);
    return () => clearInterval(t);
  }, []);

  const analysts = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return snap.analysts;
    return snap.analysts.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.tier.toLowerCase().includes(query) ||
        String(a.id).toLowerCase().includes(query)
    );
  }, [snap.analysts, q]);

  const rebalance = () => {
    // Governance-only: future feature
    // For demo we just log intent (so prof sees “design thinking”)
    mockDb.addAudit("ROSTER_REBALANCE_REQUESTED", {
      by: "superadmin",
      note: "Future: redistribute open cases by workload + SLA pressure",
    });
    setSnap(readSnap());
    alert("Rebalance logged ✅ (future backend job)");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">SuperAdmin Governance</h1>
          <p className="text-white/60 mt-1">
            System-level controls: analyst tiers, shift coverage, and routing governance.
          </p>
        </div>

        <button
          onClick={rebalance}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Rebalance (log)
        </button>
      </div>

      {/* Roster */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Analyst Roster (Tier + Shift)</div>
            <div className="text-xs text-white/50 mt-1">
              Auto-assignment uses this: HIGH/CRITICAL → Tier 2. MED/LOW → Tier 1 (Tier 2 fallback).
            </div>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full md:w-80 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
            placeholder="Search analysts..."
          />
        </div>

        <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-white/50 border-b border-white/10">
          <div>Analyst</div>
          <div>Email</div>
          <div>Tier</div>
          <div>Shift</div>
          <div>Routing Impact</div>
          <div>Actions</div>
        </div>

        {analysts.map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-6 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-b-0 items-center"
          >
            <div className="text-white/80">{a.name}</div>
            <div className="text-white/70">{a.email}</div>

            <div>
              <select
                value={a.tier}
                onChange={(e) => {
                  updateAnalyst(a.id, { tier: e.target.value });
                  mockDb.addAudit("ANALYST_TIER_CHANGED", {
                    analyst_id: a.id,
                    email: a.email,
                    tier: e.target.value,
                  });
                  setSnap(readSnap());
                }}
                className="h-9 rounded-xl border border-white/10 bg-black/30 px-2 text-sm text-white/80 outline-none"
              >
                <option value="T1">T1</option>
                <option value="T2">T2</option>
              </select>
            </div>

            <div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                  a.active
                    ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
                    : "bg-white/5 text-white/60 border-white/10"
                }`}
              >
                {a.active ? "ACTIVE" : "OFFLINE"}
              </span>
            </div>

            <div className="text-xs text-white/55">
              {a.tier === "T2"
                ? "Handles HIGH/CRITICAL"
                : "Handles MED/LOW"}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateAnalyst(a.id, { active: !a.active });
                  mockDb.addAudit("ANALYST_SHIFT_TOGGLED", {
                    analyst_id: a.id,
                    email: a.email,
                    active: !a.active,
                  });
                  setSnap(readSnap());
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
              >
                Toggle Shift
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Governance logs */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Governance Audit (latest)</div>
        <div className="text-xs text-white/50 mt-1">
          Changes in tiers/shifts must be auditable in regulated environments.
        </div>

        <div className="mt-3 space-y-2 max-h-[280px] overflow-auto pr-1">
          {snap.audit.slice(0, 20).map((l) => (
            <div key={l.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="text-xs text-white/50">{l.created_at}</div>
              <div className="text-sm font-semibold mt-1">{l.action}</div>
              <div className="text-xs text-white/60 mt-1">{JSON.stringify(l.meta)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
