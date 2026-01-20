import { useEffect, useMemo, useState } from "react";
import { caseApi } from "../services/caseApi";
import CaseDrawer from "./CaseDetails";

const badge = {
  NEW: "bg-sky-500/15 text-sky-200 border-sky-500/20",
  IN_REVIEW: "bg-amber-500/15 text-amber-200 border-amber-500/20",
  ESCALATED: "bg-rose-500/15 text-rose-200 border-rose-500/20",
  CLOSED: "bg-emerald-500/15 text-emerald-200 border-emerald-500/20",
};

const toMins = (ms) => Math.max(0, Math.floor(ms / 60000));

function fmtPct(x) {
  if (!isFinite(x)) return "0%";
  return `${Math.round(x)}%`;
}

function InsightCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint ? <div className="text-xs text-white/40 mt-1">{hint}</div> : null}
    </div>
  );
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-sky-400/30"
    >
      {children}
    </select>
  );
}

function Chip({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "bg-white/10 text-white border-white/20"
          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span
        className={`min-w-[26px] text-center rounded-full px-2 py-0.5 text-[11px] border ${
          active
            ? "border-white/20 bg-black/30 text-white/80"
            : "border-white/10 bg-black/20 text-white/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function BulkBar({ count, onClear, onAction, busy }) {
  return (
    <div className="sticky top-16 z-20">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/80">
          <b>{count}</b> selected
          <span className="text-white/40"> • </span>
          <span className="text-white/60">Bulk actions</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => onAction("IN_REVIEW")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition disabled:opacity-60"
          >
            Mark IN_REVIEW
          </button>

          <button
            disabled={busy}
            onClick={() => onAction("ESCALATED")}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/15 transition disabled:opacity-60"
          >
            Escalate
          </button>

          <button
            disabled={busy}
            onClick={() => onAction("CLOSED")}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/15 transition disabled:opacity-60"
          >
            Close
          </button>

          <button
            disabled={busy}
            onClick={onClear}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition disabled:opacity-60"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Cases() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [showClosed, setShowClosed] = useState(false);
  const [sort, setSort] = useState("SLA"); // SLA | RISK | NEWEST

  // Quick chips
  const [chipDueSoon, setChipDueSoon] = useState(false); // SLA <= 30
  const [chipHighRisk, setChipHighRisk] = useState(false); // risk >= 75
  const [chipEscalated, setChipEscalated] = useState(false); // status escalated
  const [chipNew, setChipNew] = useState(false); // status new

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setErr("");
        const data = await caseApi.list();
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load cases");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 1200);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const all = useMemo(() => rows, [rows]);

  // chip counts (respect showClosed only)
  const chipCounts = useMemo(() => {
    const now = Date.now();
    const base = showClosed ? all : all.filter((c) => c.status !== "CLOSED");

    return {
      dueSoon: base.filter((c) => toMins(new Date(c.sla_due_at).getTime() - now) <= 30).length,
      highRisk: base.filter((c) => Number(c.risk_score || 0) >= 75).length,
      escalated: base.filter((c) => c.status === "ESCALATED").length,
      isNew: base.filter((c) => c.status === "NEW").length,
    };
  }, [all, showClosed]);

  const view = useMemo(() => {
    const now = Date.now();
    const query = q.trim().toLowerCase();

    let out = [...all];

    if (!showClosed) out = out.filter((c) => c.status !== "CLOSED");

    // chips
    if (chipDueSoon) out = out.filter((c) => toMins(new Date(c.sla_due_at).getTime() - now) <= 30);
    if (chipHighRisk) out = out.filter((c) => Number(c.risk_score || 0) >= 75);
    if (chipEscalated) out = out.filter((c) => c.status === "ESCALATED");
    if (chipNew) out = out.filter((c) => c.status === "NEW");

    // dropdowns
    if (status !== "ALL") out = out.filter((c) => c.status === status);
    if (priority !== "ALL")
      out = out.filter((c) => String(c.priority || "").toUpperCase() === priority);

    // search
    if (query) {
      out = out.filter((c) => {
        const a = String(c.case_id || "").toLowerCase();
        const b = String(c.tx_id || "").toLowerCase();
        return a.includes(query) || b.includes(query);
      });
    }

    // sort
    if (sort === "SLA") {
      out.sort((a, b) => {
        const am = toMins(new Date(a.sla_due_at).getTime() - now);
        const bm = toMins(new Date(b.sla_due_at).getTime() - now);
        return am - bm;
      });
    } else if (sort === "RISK") {
      out.sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0));
    } else {
      out.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return out;
  }, [
    all,
    q,
    status,
    priority,
    showClosed,
    sort,
    chipDueSoon,
    chipHighRisk,
    chipEscalated,
    chipNew,
  ]);

  // keep selection valid when view changes (remove ids no longer present)
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set();
      const allowed = new Set(view.map((c) => c.case_id));
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next;
    });
  }, [view]);

  const insights = useMemo(() => {
    const now = Date.now();
    const open = view.filter((c) => c.status !== "CLOSED");
    const escalated = view.filter((c) => c.status === "ESCALATED");

    const createdLast10 = view.filter((c) => {
      const t = new Date(c.created_at || 0).getTime();
      return now - t <= 10 * 60 * 1000;
    });

    const avgSlaMins =
      open.length === 0
        ? 0
        : Math.round(
            open.reduce((acc, c) => {
              const mins = toMins(new Date(c.sla_due_at).getTime() - now);
              return acc + mins;
            }, 0) / open.length
          );

    const escRate = view.length ? (escalated.length / view.length) * 100 : 0;
    const highRisk = view.filter((c) => Number(c.risk_score || 0) >= 75).length;

    const priorityCounts = open.reduce((acc, c) => {
      const p = String(c.priority || "—").toUpperCase();
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const topPriorityLabel =
      Object.entries(priorityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return {
      openCount: open.length,
      new10: createdLast10.length,
      escRate,
      avgSlaMins,
      highRisk,
      topPriorityLabel,
    };
  }, [view]);

  const clearFilters = () => {
    setQ("");
    setStatus("ALL");
    setPriority("ALL");
    setShowClosed(false);
    setSort("SLA");
    setChipDueSoon(false);
    setChipHighRisk(false);
    setChipEscalated(false);
    setChipNew(false);
    setSelectedIds(new Set());
  };

  const allSelected = view.length > 0 && selectedIds.size === view.length;

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (view.length === 0) return new Set();
      if (prev.size === view.length) return new Set();
      return new Set(view.map((c) => c.case_id));
    });
  };

  const toggleOne = (caseId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const bulkAction = async (newStatus) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Apply "${newStatus}" to ${selectedIds.size} case(s)?`)) return;

    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);

      // sequential (safe for mock/backends)
      for (const id of ids) {
        await caseApi.update(id, { status: newStatus });
      }

      // refresh view quickly
      const data = await caseApi.list();
      setRows(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
    } catch (e) {
      alert(e?.message || "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Cases</h1>
          <p className="text-white/60 mt-1">
            Analyst case queue with SLA, priority, and escalation lifecycle.
          </p>
        </div>

        <button
          onClick={clearFilters}
          className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/70 hover:bg-white/10 transition"
        >
          Clear filters
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <BulkBar
          count={selectedIds.size}
          busy={bulkBusy}
          onClear={() => setSelectedIds(new Set())}
          onAction={bulkAction}
        />
      )}

      {/* Errors */}
      {err && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {err}
        </div>
      )}

      {/* Controls */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          <Chip
            active={chipDueSoon}
            label="Due Soon (≤ 30m)"
            count={chipCounts.dueSoon}
            onClick={() => setChipDueSoon((v) => !v)}
          />
          <Chip
            active={chipHighRisk}
            label="High Risk (≥ 75%)"
            count={chipCounts.highRisk}
            onClick={() => setChipHighRisk((v) => !v)}
          />
          <Chip
            active={chipEscalated}
            label="Escalated"
            count={chipCounts.escalated}
            onClick={() => setChipEscalated((v) => !v)}
          />
          <Chip
            active={chipNew}
            label="New"
            count={chipCounts.isNew}
            onClick={() => setChipNew((v) => !v)}
          />
        </div>

        {/* Form row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <div className="text-xs text-white/50 mb-2">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Case ID or TX ID..."
              className="w-full h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-sky-400/30"
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/50 mb-2">Status</div>
            <Select value={status} onChange={setStatus}>
              <option value="ALL">All</option>
              <option value="NEW">NEW</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="CLOSED">CLOSED</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/50 mb-2">Priority</div>
            <Select value={priority} onChange={setPriority}>
              <option value="ALL">All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/50 mb-2">Sort</div>
            <Select value={sort} onChange={setSort}>
              <option value="SLA">SLA soonest</option>
              <option value="RISK">Risk (high→low)</option>
              <option value="NEWEST">Newest</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/50 mb-2">Visibility</div>
            <label className="flex items-center gap-2 text-sm text-white/70 select-none">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="h-4 w-4 accent-sky-500"
              />
              Show Closed
            </label>
          </div>
        </div>

        <div className="mt-3 text-xs text-white/45">
          Showing <b className="text-white/70">{view.length}</b> case(s) based on filters.
          {selectedIds.size > 0 ? (
            <>
              <span className="text-white/40"> • </span>
              <span className="text-white/60">
                {selectedIds.size} selected
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <InsightCard label="Open Cases" value={insights.openCount} hint="Active workload" />
        <InsightCard label="New (10 min)" value={insights.new10} hint="Spikes / waves" />
        <InsightCard label="High Risk" value={insights.highRisk} hint="Risk ≥ 75%" />
        <InsightCard label="Escalation Rate" value={fmtPct(insights.escRate)} hint="Escalated / total" />
        <InsightCard label="Avg SLA Remaining" value={`${insights.avgSlaMins} min`} hint="Filtered view" />
        <InsightCard label="Top Priority" value={insights.topPriorityLabel} hint="Most common" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="grid grid-cols-7 gap-2 px-4 py-3 text-xs text-white/50 border-b border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 accent-sky-500"
              title="Select all in current view"
            />
            <span>Select</span>
          </div>
          <div>Case</div>
          <div>TX</div>
          <div>Risk</div>
          <div>Priority</div>
          <div>Status</div>
          <div>SLA</div>
        </div>

        {loading ? (
          <div className="px-4 py-6 text-sm text-white/60">Loading cases…</div>
        ) : view.length === 0 ? (
          <div className="px-4 py-6 text-sm text-white/60">
            No cases match your filters.
          </div>
        ) : (
          view.map((c) => {
            const checked = selectedIds.has(c.case_id);
            return (
              <div
                key={c.case_id}
                className="grid grid-cols-7 gap-2 px-4 py-3 text-sm border-b border-white/5 last:border-b-0 hover:bg-white/5 transition"
              >
                {/* checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOne(c.case_id)}
                    className="h-4 w-4 accent-sky-500"
                  />
                </div>

                {/* clickable row content (open drawer) */}
                <button
                  onClick={() => setSelected(c)}
                  className="text-left col-span-6 grid grid-cols-6 gap-2"
                >
                  <div className="text-white/80">{c.case_id}</div>
                  <div className="text-white/70">{c.tx_id}</div>
                  <div className="text-white/70 font-semibold">{c.risk_score}%</div>
                  <div className="text-white/70">{c.priority}</div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
                        badge[c.status] || "bg-white/5 text-white/70 border-white/10"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="text-white/60 text-xs">
                    {toMins(new Date(c.sla_due_at) - Date.now())} min
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      {selected && <CaseDrawer caseData={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
